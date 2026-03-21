import { wsManager } from "./websocket-manager";
import type { BinanceOrderFlowData } from "@/hooks/use-order-flow";
import { PERFORMANCE_CONFIG } from "./performance-config";
import { getHistoricalKlines } from "./binance-service";
import { microstructureService } from "./microstructure-service";

export type TradeListener = (data: BinanceOrderFlowData) => void;

interface SymbolState {
    listeners: Set<TradeListener>;
    hotLayer: BinanceOrderFlowData[];
    batchBuffer: BinanceOrderFlowData[];
    flushInterval: NodeJS.Timeout | null;
    tier: 1 | 2 | 3;
    cooldownTimeout: NodeJS.Timeout | null;
    lastDataTimestamp: number;
}

class DataHub {
    private symbolStates = new Map<string, SymbolState>();
    private readonly HOT_LAYER_MAX_SIZE = 5000;
    private readonly BATCH_FLUSH_MS = PERFORMANCE_CONFIG.BATCH_FLUSH_MS;

    // Multi-Stream Shared Connection
    private readonly SHARED_WS_URL = 'wss://fstream.binance.com/ws';
    private readonly WS_ID = 'dataHub-Shared';
    private isSharedConnectionOpen = false;
    private connectionListeners = new Set<(connected: boolean) => void>();
    private currentlySubscribedStreams = new Set<string>();

    constructor() {
        this.initSharedConnection();
        // Initialize Tier 1 assets immediately
        PERFORMANCE_CONFIG.PRIORITY_ASSETS.forEach(symbol => {
            this.initSymbolState(symbol, 1);
        });

        // After initial setup, update subscriptions
        setTimeout(() => this.updateSubscriptions(), 1000);
    }

    private initSymbolState(symbol: string, tier: 1 | 2 | 3) {
        const upperSymbol = symbol.toUpperCase();
        if (this.symbolStates.has(upperSymbol)) {
            const state = this.symbolStates.get(upperSymbol)!;
            // Upgrade tier if needed (e.g., from 3 to 2)
            if (tier < state.tier) {
                state.tier = tier;
                if (state.cooldownTimeout) {
                    clearTimeout(state.cooldownTimeout);
                    state.cooldownTimeout = null;
                }
            }
            return state;
        }

        const state: SymbolState = {
            listeners: new Set(),
            hotLayer: [],
            batchBuffer: [],
            flushInterval: setInterval(() => this.flushToDatabase(upperSymbol), this.BATCH_FLUSH_MS),
            tier: tier,
            cooldownTimeout: null,
            lastDataTimestamp: 0
        };
        this.symbolStates.set(upperSymbol, state);
        return state;
    }

    public subscribe(symbol: string, listener: TradeListener) {
        const upperSymbol = symbol.toUpperCase();

        // Determine tier (1 if in Priority list, otherwise 2 for Active Context)
        const isTier1 = PERFORMANCE_CONFIG.PRIORITY_ASSETS.includes(upperSymbol);
        const tier = isTier1 ? 1 : 2;

        const state = this.initSymbolState(upperSymbol, tier);
        state.listeners.add(listener);

        this.updateSubscriptions();
    }

    public unsubscribe(symbol: string, listener: TradeListener) {
        const upperSymbol = symbol.toUpperCase();
        const state = this.symbolStates.get(upperSymbol);

        if (state) {
            state.listeners.delete(listener);

            if (state.listeners.size === 0 && state.tier !== 1) {
                // No more listeners, and not Tier 1. Move to Tier 3 (Cooldown)
                state.tier = 3;

                if (state.cooldownTimeout) clearTimeout(state.cooldownTimeout);

                state.cooldownTimeout = setTimeout(() => {
                    // Cooldown expired
                    this.cleanupSymbol(upperSymbol);
                    this.updateSubscriptions();
                }, PERFORMANCE_CONFIG.COOLDOWN_MS);
            }
        }
    }

    private cleanupSymbol(symbol: string) {
        const state = this.symbolStates.get(symbol);
        if (state) {
            if (state.flushInterval) clearInterval(state.flushInterval);
            if (state.cooldownTimeout) clearTimeout(state.cooldownTimeout);
            this.flushToDatabase(symbol); // Final flush
            this.symbolStates.delete(symbol);
        }
    }

    public onConnection(symbol: string, listener: (connected: boolean) => void) {
        // We ignore the specific symbol for connection status,
        // and just report the shared connection status.
        this.connectionListeners.add(listener);

        // Immediate callback if already connected
        if (this.isSharedConnectionOpen) {
            listener(true);
        }
    }

    private notifyConnectionListeners(connected: boolean) {
        this.isSharedConnectionOpen = connected;
        this.connectionListeners.forEach(l => l(connected));
    }

    private initSharedConnection() {
        const ws = wsManager.createConnection(this.WS_ID, { url: this.SHARED_WS_URL });

        ws.addEventListener('open', () => {
            this.notifyConnectionListeners(true);
            this.currentlySubscribedStreams.clear(); // Reset on reconnect
            this.updateSubscriptions(); // Re-subscribe everything
        });

        ws.addEventListener('close', () => {
            this.notifyConnectionListeners(false);
            this.currentlySubscribedStreams.clear();
        });

        ws.addEventListener('error', () => {
             this.notifyConnectionListeners(false);
        });

        ws.addEventListener('message', (data: any) => {
            if (data.e === 'aggTrade') {
                const symbol = data.s.toUpperCase();
                const timestamp = data.T;

                const orderData: BinanceOrderFlowData = {
                    id: data.a.toString(),
                    timestamp: timestamp,
                    price: parseFloat(data.p),
                    quantity: parseFloat(data.q),
                    side: data.m ? 'sell' : 'buy',
                    symbol: symbol,
                    microstructure: microstructureService.analyzeTrade(symbol, parseFloat(data.q), parseFloat(data.p), !data.m)
                };

                const state = this.symbolStates.get(symbol);
                if (state) {
                    // Check for gaps (Simulation Guard)
                    // We consider a gap if there is no data for > 10 seconds AND we had data before
                    // Note: In real life aggTrades can be sparse for illiquid assets,
                    // but we will do a simple check: if we reconnected, or if gap > 60s
                    // For simplicity, we just trigger a stitch check if it's been more than 60s since last trade
                    // In a production env, we'd also track WS reconnects precisely.
                    if (state.lastDataTimestamp > 0 && timestamp - state.lastDataTimestamp > 60000) {
                        this.handleStitching(symbol, state.lastDataTimestamp, timestamp);
                    }

                    state.lastDataTimestamp = timestamp;

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
            } else if (data && data.e === 'markPriceUpdate') {
                // Parse funding rate and mark price variables
                const symbol = data.s.toUpperCase();
                const fundingRate = parseFloat(data.r);
                import('./microstructure-service').then(({ microstructureService }) => {
                    microstructureService.updateFundingRate(symbol, fundingRate);
                });
            }
        });

        ws.connect(this.SHARED_WS_URL).catch(err => console.error(`[DataHub] Failed to connect shared WS:`, err));
    }

    private updateSubscriptions() {
        if (!this.isSharedConnectionOpen) return;

        const desiredStreams = new Set<string>();

        // Build desired streams list based on active states (Tier 1, 2, 3)
        // limit by MAX_CONCURRENT_STREAMS
        const allSymbols = Array.from(this.symbolStates.keys());

        // Priority: Tier 1 > Tier 2 > Tier 3
        const sortedSymbols = allSymbols.sort((a, b) => {
            const stateA = this.symbolStates.get(a)!;
            const stateB = this.symbolStates.get(b)!;
            return stateA.tier - stateB.tier;
        });

        const symbolsToSub = sortedSymbols.slice(0, PERFORMANCE_CONFIG.MAX_CONCURRENT_STREAMS);

        symbolsToSub.forEach(sym => {
            desiredStreams.add(`${sym.toLowerCase()}@aggTrade`);
            desiredStreams.add(`${sym.toLowerCase()}@markPrice@1s`);
        });

        // Calculate differences
        const toSubscribe: string[] = [];
        const toUnsubscribe: string[] = [];

        desiredStreams.forEach(stream => {
            if (!this.currentlySubscribedStreams.has(stream)) {
                toSubscribe.push(stream);
            }
        });

        this.currentlySubscribedStreams.forEach(stream => {
            if (!desiredStreams.has(stream)) {
                toUnsubscribe.push(stream);
            }
        });

        const ws = wsManager.getConnection(this.WS_ID);
        if (!ws || !ws.isConnected()) return;

        if (toSubscribe.length > 0) {
            ws.send({
                method: "SUBSCRIBE",
                params: toSubscribe,
                id: Date.now()
            });
            toSubscribe.forEach(s => this.currentlySubscribedStreams.add(s));
        }

        if (toUnsubscribe.length > 0) {
            ws.send({
                method: "UNSUBSCRIBE",
                params: toUnsubscribe,
                id: Date.now() + 1
            });
            toUnsubscribe.forEach(s => this.currentlySubscribedStreams.delete(s));
        }
    }

    private async handleStitching(symbol: string, startTime: number, endTime: number) {
        console.log(`[DataHub] Gap detected for ${symbol} between ${startTime} and ${endTime}. Triggering Data Stitching.`);
        try {
            // Fetch 1m klines for the gap period to patch missing history
            const klines = await getHistoricalKlines(symbol, '1m', startTime, endTime);
            if (klines && klines.length > 0) {
                 const state = this.symbolStates.get(symbol);
                 if (!state) return;

                 // Transform klines into simulated trades to feed the database
                 const stitchedTrades: BinanceOrderFlowData[] = klines.map((k: any) => ({
                     id: `stitched-${k.time}-${symbol}`,
                     timestamp: k.time,
                     price: k.close,
                     quantity: k.volume,
                     side: 'buy', // Synthesized as buy, doesn't perfectly reflect order flow
                     symbol: symbol
                 }));

                 // Add to batch buffer so it gets saved to DB
                 state.batchBuffer.push(...stitchedTrades);
                 console.log(`[DataHub] Stitched ${stitchedTrades.length} records for ${symbol}.`);
            }
        } catch (e) {
            console.error(`[DataHub] Failed to stitch data for ${symbol}:`, e);
        }
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
