import { globalApiQueue, PriorityLevel } from './api-priority-queue';
import { getHistoricalKlines } from './binance-service';

// Target timestamp (2 months ago)
const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;
const CHUNK_SIZE = 1000;
const COOLDOWN_MS = 2000;

class LazyBackfillWorker {
    private isRunning = false;
    private symbol: string = '';
    private interval: string = '1m';
    private lastSavedTimestamp: number = 0;
    
    // UI Progress trackers
    public totalGaps: number = 0;
    public solvedGaps: number = 0;
    private onProgressChange: ((percent: number) => void) | null = null;
    
    public init(symbol: string, onProgressChange?: (p: number) => void) {
        this.symbol = symbol;
        if (onProgressChange) this.onProgressChange = onProgressChange;
        
        const now = Date.now();
        this.lastSavedTimestamp = now; 
        
        // In a real app we'd fetch the TRUE lastSavedTimestamp from DuckDB
        // For demonstration of the gap, we'll scan back entirely:
        this.totalGaps = TWO_MONTHS_MS / (60 * 1000); // How many 1m candles in 2 months
        this.solvedGaps = 0;
    }

    public async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        // Background slow-fetch loop protecting the UI Main Thread
        this.processNextChunk();
    }

    public pause() {
        this.isRunning = false;
    }
    
    private async processNextChunk() {
        if (!this.isRunning) return;
        
        const targetEnd = this.lastSavedTimestamp;
        const targetStart = targetEnd - (CHUNK_SIZE * 60 * 1000);
        
        // Stop condition: reached 2 months ago
        if (Date.now() - targetStart > TWO_MONTHS_MS) {
            this.isRunning = false;
            if (this.onProgressChange) this.onProgressChange(100);
            return;
        }

        try {
            // Priority 3 (BACKGROUND) ensures live trading APIs execute first
            const klines = await globalApiQueue.enqueue(
                PriorityLevel.BACKGROUND,
                () => getHistoricalKlines(this.symbol, this.interval, targetStart, targetEnd)
            );

            // Transmit stitched chunk to Next.js API securely saving to DuckDB
            if (klines && klines.length > 0) {
               // Fire and forget so we don't bind up the thread waiting for disk I/O
               fetch('/api/db/save', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ 
                       source: 'BACKFILL', 
                       symbol: this.symbol, 
                       data: klines 
                   })
               }).catch(e => console.error("DuckDB save failed (background worker):", e));

               this.lastSavedTimestamp = targetStart;
               this.solvedGaps += klines.length;
               
               if (this.onProgressChange) {
                   const progress = Math.min((this.solvedGaps / this.totalGaps) * 100, 100);
                   this.onProgressChange(progress);
               }
            }
        } catch (error) {
            console.warn(`[Lazy-Backfill] Chunk failed. Retrying...`, error);
        }

        // Pacing: Wait 2 seconds between REST calls so Binance doesn't drop 429
        setTimeout(() => this.processNextChunk(), COOLDOWN_MS);
    }
}

export const backfillEngine = new LazyBackfillWorker();
