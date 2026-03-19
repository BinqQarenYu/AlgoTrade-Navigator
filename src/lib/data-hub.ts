import { wsManager } from "./websocket-manager";
import type { BinanceOrderFlowData } from "@/hooks/use-order-flow";

export type TradeListener = (data: BinanceOrderFlowData) => void;

interface SymbolState {
    listeners: Set<TradeListener>;
    hotLayer: BinanceOrderFlowData[];
    batchBuffer: BinanceOrderFlowData[];
    flushInterval: NodeJS.Timeout | null;
}

class DataHub {
    private symbolStates = new Map<string, SymbolState>();
    private readonly HOT_LAYER_MAX_SIZE = 5000;
    private readonly BATCH_FLUSH_MS = 1000;

    public subscribe(symbol: string, listener: TradeListener) {
        const upperSymbol = symbol.toUpperCase();
        let state = this.symbolStates.get(upperSymbol);

        if (!state) {
            // Initialize new connection and state
            state = {
                listeners: new Set(),
                hotLayer: [],
                batchBuffer: [],
                flushInterval: setInterval(() => this.flushToDatabase(upperSymbol), this.BATCH_FLUSH_MS)
            };
            this.symbolStates.set(upperSymbol, state);
            this.connect(upperSymbol);
        }

        state.listeners.add(listener);
    }

    public unsubscribe(symbol: string, listener: TradeListener) {
        const upperSymbol = symbol.toUpperCase();
        const state = this.symbolStates.get(upperSymbol);

        if (state) {
            state.listeners.delete(listener);

            if (state.listeners.size === 0) {
                // No more listeners, clean up
                this.disconnect(upperSymbol);
                if (state.flushInterval) clearInterval(state.flushInterval);
                this.flushToDatabase(upperSymbol); // Final flush
                this.symbolStates.delete(upperSymbol);
            }
        }
    }

    public onConnection(symbol: string, listener: (connected: boolean) => void) {
        const url = `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@aggTrade`;
        const ws = wsManager.getConnection(`dataHub-${symbol.toUpperCase()}`);
        if (ws) {
            ws.addEventListener('open', () => listener(true));
            ws.addEventListener('close', () => listener(false));
            // Immediate callback if already connected
            if (ws.isConnected()) {
                listener(true);
            }
        }
    }

    private connect(symbol: string) {
        const url = `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@aggTrade`;
        const ws = wsManager.createConnection(`dataHub-${symbol}`, { url });

        ws.addEventListener('message', (data: any) => {
            if (data.e === 'aggTrade') {
                const orderData: BinanceOrderFlowData = {
                    id: data.a.toString(),
                    timestamp: data.T,
                    price: parseFloat(data.p),
                    quantity: parseFloat(data.q),
                    side: data.m ? 'sell' : 'buy',
                    symbol: data.s.toUpperCase()
                };

                const state = this.symbolStates.get(symbol);
                if (state) {
                    // Update Hot Layer (RAM)
                    state.hotLayer.unshift(orderData);
                    if (state.hotLayer.length > this.HOT_LAYER_MAX_SIZE) {
                        state.hotLayer.length = this.HOT_LAYER_MAX_SIZE; // Truncate
                    }

                    // Buffer for Warm Layer (Database)
                    state.batchBuffer.push(orderData);

                    // Broadcast to UI
                    state.listeners.forEach(listener => listener(orderData));
                }
            }
        });

        ws.connect(url).catch(err => console.error(`[DataHub] Failed to connect for ${symbol}:`, err));
    }

    private disconnect(symbol: string) {
        wsManager.removeConnection(`dataHub-${symbol}`);
    }

    private async flushToDatabase(symbol: string) {
        const state = this.symbolStates.get(symbol);
        if (!state || state.batchBuffer.length === 0) return;

        // Take a snapshot and clear the buffer
        const batch = [...state.batchBuffer];
        state.batchBuffer = [];

        try {
            // Save to duckdb via API route
            await fetch('/api/db/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: 'LIVE',
                    symbol: symbol,
                    data: batch
                })
            });
        } catch (e) {
            console.error(`[DataHub] Failed to write batch for ${symbol}`, e);
            // Re-buffer on failure
            if (this.symbolStates.has(symbol)) {
                this.symbolStates.get(symbol)!.batchBuffer.unshift(...batch);
            }
        }
    }
}

export const dataHub = new DataHub();
