import { connectToDB } from './db-service';
import { getSyncState, updateSyncState } from './sync-state-manager';
// Next.js Edge runtime or browser native WebSocket handles this:
// Ensure WebSocket is available
const isServer = typeof window === 'undefined';
let WebSocketClass: any;

if (isServer) {
    if (globalThis.WebSocket) {
        WebSocketClass = globalThis.WebSocket;
    } else {
        WebSocketClass = require('ws');
    }
} else {
    WebSocketClass = window.WebSocket;
}

class BinanceNativeWS {
    private ws: WebSocket | null = null;
    private symbol: string = 'btcusdt';
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 10;
    private pingIntervalId: NodeJS.Timeout | null = null;
    private isManuallyPaused: boolean = false;
    private hasRecordedFirstPacket: boolean = false;
    private tradeBuffer: any[] = [];
    private batchIntervalId: NodeJS.Timeout | null = null;

    public connect(symbol: string = 'btcusdt') {
        this.symbol = symbol.toLowerCase();

        if (this.isManuallyPaused) return;

        if (this.ws && (this.ws.readyState === WebSocketClass.OPEN || this.ws.readyState === WebSocketClass.CONNECTING)) {
            console.log("[BinanceNativeWS] WebSocket already active.");
            return;
        }

        const url = `wss://fstream.binance.com/ws/${this.symbol}@aggTrade`;
        console.log(`[BinanceNativeWS] Connecting to ${url}...`);

        this.ws = new WebSocketClass(url);

        this.ws!.onopen = () => {
            console.log(`[BinanceNativeWS] Connected to ${this.symbol}@aggTrade stream`);
            this.reconnectAttempts = 0; // reset

            this.batchIntervalId = setInterval(() => this.flushBuffer(), 1000);

            // 3-minute ping handler
            this.pingIntervalId = setInterval(() => {
                if (this.ws && this.ws.readyState === WebSocketClass.OPEN) {
                    console.log("[BinanceNativeWS] Sending heartbeat ping");
                    this.ws.send(JSON.stringify({ method: 'ping' }));
                }
            }, 3 * 60 * 1000);
        };

        this.ws!.onmessage = (event) => {
            try {
                let data = event.data;
                if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
                    data = data.toString('utf8');
                } else if (data instanceof ArrayBuffer) {
                    data = new TextDecoder().decode(data);
                }

                const parsed = JSON.parse(data as string);

                if (parsed.e === 'aggTrade') {
                    const eventTime = parsed.E;

                    if (!this.hasRecordedFirstPacket) {
                        const state = getSyncState();
                        if (!state.first_ws_packet_ms) {
                            console.log(`[BinanceNativeWS] Recording FIRST ws packet time: ${eventTime}`);
                            updateSyncState({ first_ws_packet_ms: eventTime });
                        }
                        this.hasRecordedFirstPacket = true;
                    }

                    const tradeData = {
                         id: String(parsed.a),
                         price: parseFloat(parsed.p),
                         quantity: parseFloat(parsed.q),
                         side: parsed.m ? 'SELL' : 'BUY',
                         timestamp: eventTime
                    };

                    this.tradeBuffer.push(tradeData);
                }
            } catch (err) {
                console.warn("[BinanceNativeWS] Message Parse Error", err);
            }
        };

        this.ws!.onclose = async () => {
            console.warn("[BinanceNativeWS] WebSocket closed.");
            await this.cleanup();
            if (!this.isManuallyPaused) {
                this.reconnect();
            }
        };

        this.ws!.onerror = (error) => {
            console.error("[BinanceNativeWS] WebSocket error:", error);
        };
    }

    private reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error("[BinanceNativeWS] Max reconnect attempts reached.");
            return;
        }

        this.reconnectAttempts++;
        const backoffDelay = Math.min(Math.pow(2, this.reconnectAttempts) * 1000, 60000);
        console.log(`[BinanceNativeWS] Reconnecting in ${backoffDelay}ms (Attempt ${this.reconnectAttempts})...`);

        setTimeout(() => this.connect(this.symbol), backoffDelay);
    }

    private async flushBuffer() {
        if (this.tradeBuffer.length === 0) return;

        const batch = [...this.tradeBuffer];
        this.tradeBuffer = [];

        try {
            const conn = await connectToDB();
            const stmt = conn.prepare(`
                INSERT INTO live_trades (id, symbol, price, quantity, side, timestamp, source)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO NOTHING;
            `);
            for (let i = 0; i < batch.length; i++) {
                const t = batch[i];
                stmt.run(t.id, this.symbol.toUpperCase(), t.price, t.quantity, t.side, t.timestamp, 'LIVE');
            }
            stmt.finalize();
        } catch (e) {
            console.error("[BinanceNativeWS] Batch save failed:", e);
        }
    }

    private async cleanup() {
        if (this.batchIntervalId) {
            clearInterval(this.batchIntervalId);
            this.batchIntervalId = null;
            await this.flushBuffer();
        }
        if (this.pingIntervalId) {
            clearInterval(this.pingIntervalId);
            this.pingIntervalId = null;
        }
        if (this.ws) {
            this.ws.onclose = null;
            this.ws.onmessage = null;
            this.ws.onerror = null;
            this.ws.onopen = null;
            if (this.ws.readyState === WebSocketClass.OPEN) {
                 this.ws.close();
            }
            this.ws = null;
        }
    }

    public async pause() {
        console.log("[BinanceNativeWS] Pausing...");
        this.isManuallyPaused = true;
        await this.cleanup();
    }

    public resume() {
        console.log("[BinanceNativeWS] Resuming...");
        this.isManuallyPaused = false;
        this.connect(this.symbol);
    }
}

export const binanceWSEngine = new BinanceNativeWS();
