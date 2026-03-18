import { connectToDB } from './db-service';
import { globalApiQueue, PriorityLevel } from './api-priority-queue';
import { getSyncState, updateSyncState } from './sync-state-manager';
import ccxt from 'ccxt';

// Target timestamp (2 months ago)
const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;
const CHUNK_SIZE = 1000;
const COOLDOWN_MS = 2000;
const MAX_WEIGHT = 2400;

class LazyBackfillWorker {
    private isRunning = false;
    private symbol: string = '';
    private lastFetchedTimestamp: number = 0;
    private endGoalTimestamp: number | null = null;
    private exchange: ccxt.binance;
    
    // UI Progress trackers
    public totalGaps: number = 0;
    public solvedGaps: number = 0;
    private onProgressChange: ((percent: number) => void) | null = null;

    constructor() {
        this.exchange = new ccxt.binance({
            enableRateLimit: true,
            options: {
                defaultType: 'future'
            }
        });
    }
    
    public init(symbol: string, onProgressChange?: (p: number) => void) {
        this.symbol = symbol;
        if (onProgressChange) this.onProgressChange = onProgressChange;
        
        const state = getSyncState();
        this.lastFetchedTimestamp = state.last_fetched_ms;
        this.endGoalTimestamp = state.first_ws_packet_ms;

        if (this.endGoalTimestamp) {
            this.totalGaps = (this.endGoalTimestamp - this.lastFetchedTimestamp) / (60 * 1000);
        } else {
            this.totalGaps = TWO_MONTHS_MS / (60 * 1000);
        }
        
        this.solvedGaps = 0;
    }

    public async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        this.processNextChunk();
    }

    public resume() {
        if (!this.isRunning) {
            this.start();
        }
    }

    public pause() {
        this.isRunning = false;
    }
    
    private async processNextChunk() {
        if (!this.isRunning) return;
        
        const state = getSyncState();
        this.endGoalTimestamp = state.first_ws_packet_ms;

        const currentTarget = this.lastFetchedTimestamp;
        
        // Stop condition
        if (this.endGoalTimestamp && currentTarget >= this.endGoalTimestamp) {
            this.isRunning = false;
            updateSyncState({ historical_backfill: { status: 'complete' } });
            if (this.onProgressChange) this.onProgressChange(100);
            return;
        }

        try {
            // Priority 3 (BACKGROUND) ensures live trading APIs execute first
            const trades = await globalApiQueue.enqueue(
                PriorityLevel.BACKGROUND,
                async () => {
                    const res = await this.exchange.fetchTrades(this.symbol, currentTarget, CHUNK_SIZE, {
                        fromId: undefined
                    });
                    return res;
                }
            );

            // Weight Guard: Check Binance limits natively inside CCXT
            if (this.exchange.last_response_headers) {
                 const usedWeightStr = this.exchange.last_response_headers['x-mbx-used-weight-1m'];
                 if (usedWeightStr) {
                      const usedWeight = parseInt(usedWeightStr as string, 10);
                      if (usedWeight > MAX_WEIGHT * 0.6) {
                           console.warn(`[Lazy-Backfill] Weight Guard Tripped! Used: ${usedWeight}. Sleeping for 10s.`);
                           await new Promise(res => setTimeout(res, 10000));
                      }
                 }
            }

            if (trades && trades.length > 0) {
               const mappedTrades = trades.map(t => ({
                   id: t.id,
                   price: t.price,
                   quantity: t.amount,
                   side: t.side ? t.side.toUpperCase() : 'BUY',
                   timestamp: t.timestamp
               }));

               try {
                   const conn = await connectToDB();
                   const stmt = conn.prepare(`
                       INSERT INTO live_trades (id, symbol, price, quantity, side, timestamp, source)
                       VALUES (?, ?, ?, ?, ?, ?, ?)
                       ON CONFLICT (id) DO NOTHING;
                   `);
                   for (let i = 0; i < mappedTrades.length; i++) {
                       const t = mappedTrades[i];
                       stmt.run(t.id, this.symbol.toUpperCase(), t.price, t.quantity, t.side, t.timestamp, 'BACKFILL');
                   }
                   stmt.finalize();
               } catch (e) {
                   console.error("DuckDB save failed (background worker):", e);
               }

               const maxTimestamp = Math.max(...trades.map(t => t.timestamp || 0));
               this.lastFetchedTimestamp = maxTimestamp > currentTarget ? maxTimestamp : currentTarget + 1000;

               updateSyncState({ last_fetched_ms: this.lastFetchedTimestamp, historical_backfill: { status: 'in_progress' } });

               this.solvedGaps++;
               
               if (this.onProgressChange) {
                   const startTime = (this.endGoalTimestamp || Date.now()) - TWO_MONTHS_MS;
                   const timeElapsed = this.lastFetchedTimestamp - startTime;
                   const totalTimeWindow = (this.endGoalTimestamp || Date.now()) - startTime;
                   const progress = Math.max(0, Math.min(100, (timeElapsed / Math.max(totalTimeWindow, 1)) * 100));
                   this.onProgressChange(progress);
               }
            } else {
               this.lastFetchedTimestamp += 60 * 1000;
            }
        } catch (error) {
            console.warn(`[Lazy-Backfill] Chunk failed. Retrying...`, error);
        }

        setTimeout(() => this.processNextChunk(), COOLDOWN_MS);
    }
}




export const backfillEngine = new LazyBackfillWorker();
