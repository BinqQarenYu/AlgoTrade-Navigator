/**
 * lazy-backfill-worker.ts (Production Rewrite)
 *
 * Smart REST backfill engine that:
 * - Reads sync_state.json to find the actual gap (never re-downloads)
 * - Fetches 1,000 records per REST chunk via CCXT
 * - Monitors X-MBX-USED-WEIGHT (via proxy header): if > 60%, pauses 10s
 * - Survives app restarts via manifest persistence
 * - Reports granular progress via callback for Settings UI
 */

import { getGap, updateSyncState } from './sync-state-manager';
import { globalApiQueue, PriorityLevel } from './api-priority-queue';
import { bufferOHLCVBatch } from './db-service';
import { getHistoricalKlines } from './binance-service';

export interface BackfillProgress {
  symbol: string;
  percent: number;           // 0–100
  daysCovered: number;
  totalDays: number;
  isPaused: boolean;
  pauseReason?: string;
  lastChunkTimestamp: number;
}

// Tunables
const CHUNK_CANDLES = 1000;      // candles per REST call
const COOLDOWN_BASE_MS = 2000;   // wait between chunks (normal)
const WEIGHT_PAUSE_MS = 10_000;  // pause duration when weight > 60%
const WEIGHT_THRESHOLD = 0.6;    // 60% of 1200 = 720 used weight
const LOOKBACK_MS = 60 * 24 * 60 * 60 * 1000; // 2 months

class LazyBackfillEngine {
  private isRunning = false;
  private isPaused = false;
  private pauseReason = '';
  private currentSymbol = '';
  private currentInterval = '1m';
  private progressCallback: ((p: BackfillProgress) => void) | null = null;

  // Per-session tracking
  private gapStartMs = 0;
  private gapEndMs = 0;
  private currentFetchEnd = 0;

  // Weight tracking (updated from proxy response headers or manually)
  private lastUsedWeight = 0;
  private weightLimit = 1200;

  public init(
    symbol: string,
    interval: string = '1m',
    onProgress?: (p: BackfillProgress) => void
  ): void {
    this.currentSymbol = symbol;
    this.currentInterval = interval;
    if (onProgress) this.progressCallback = onProgress;

    const gap = getGap(symbol, LOOKBACK_MS);
    if (!gap) {
      console.log(`[Backfill] ${symbol} is already fully covered. Skipping.`);
      if (this.progressCallback) {
        this.progressCallback({
          symbol,
          percent: 100,
          daysCovered: 60,
          totalDays: 60,
          isPaused: false,
          lastChunkTimestamp: Date.now(),
        });
      }
      return;
    }

    this.gapStartMs = gap.gapStartMs;
    this.gapEndMs = gap.gapEndMs;
    this.currentFetchEnd = this.gapEndMs;

    console.log(`[Backfill] ${symbol}: Gap identified from ${new Date(this.gapStartMs).toISOString()} to ${new Date(this.gapEndMs).toISOString()}`);
  }

  public start(): void {
    if (this.isRunning) return;
    if (!this.currentSymbol) return;
    if (this.gapStartMs === 0) return; // backfill already complete

    this.isRunning = true;
    this.isPaused = false;
    this.scheduleNextChunk(0);
  }

  public pause(reason = 'Manual pause'): void {
    this.isPaused = true;
    this.pauseReason = reason;
  }

  public resume(): void {
    if (!this.isRunning) {
      this.start();
      return;
    }
    this.isPaused = false;
    this.pauseReason = '';
    this.scheduleNextChunk(0);
  }

  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
  }

  /** Called by proxy layer to update the known API weight */
  public updateWeight(used: number, limit: number = 1200): void {
    this.lastUsedWeight = used;
    this.weightLimit = limit;
  }

  private scheduleNextChunk(delayMs: number): void {
    setTimeout(() => this.processChunk(), delayMs);
  }

  private async processChunk(): Promise<void> {
    if (!this.isRunning || this.isPaused) return;

    // Stop condition: reached the target start
    if (this.currentFetchEnd <= this.gapStartMs) {
      this.isRunning = false;
      const isComplete = true;
      updateSyncState(
        this.currentSymbol,
        this.gapStartMs,
        this.gapEndMs,
        0,
        isComplete
      );
      this.reportProgress(true);
      console.log(`[Backfill] ${this.currentSymbol}: COMPLETE ✓`);
      return;
    }

    // Weight guard: pause if API is too hot
    const weightRatio = this.lastUsedWeight / this.weightLimit;
    if (weightRatio > WEIGHT_THRESHOLD) {
      const waitMsg = `API weight ${Math.round(weightRatio * 100)}% > 60%. Pausing ${WEIGHT_PAUSE_MS / 1000}s...`;
      console.warn(`[Backfill Weight Guard] ${waitMsg}`);
      this.pause(waitMsg);
      setTimeout(() => {
        this.isPaused = false;
        this.pauseReason = '';
        this.scheduleNextChunk(0);
      }, WEIGHT_PAUSE_MS);
      return;
    }

    // Calculate chunk window (walk backwards from current fetch end)
    const interval1mMs = 60 * 1000;
    const chunkStartMs = Math.max(
      this.gapStartMs,
      this.currentFetchEnd - CHUNK_CANDLES * interval1mMs
    );
    const chunkEndMs = this.currentFetchEnd;

    try {
      // Priority 3 (BACKGROUND) — never blocks live orders or maintenance
      const klines = await globalApiQueue.enqueue(
        PriorityLevel.BACKGROUND,
        () => getHistoricalKlines(this.currentSymbol, this.currentInterval, chunkStartMs, chunkEndMs)
      );

      if (klines && klines.length > 0) {
        // Buffer to DuckDB (will be flushed every 10s automatically)
        bufferOHLCVBatch(
          klines.map(k => ({
            symbol: this.currentSymbol,
            interval: this.currentInterval,
            time: k.time,
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: k.volume,
            source: 'BACKFILL' as const,
          }))
        );

        // Advance the cursor
        this.currentFetchEnd = chunkStartMs;

        // Update manifest so this survives restart
        updateSyncState(
          this.currentSymbol,
          chunkStartMs,
          klines[klines.length - 1].time,
          klines.length,
          false
        );

        this.reportProgress(false);
        console.log(
          `[Backfill] ${this.currentSymbol}: Saved ${klines.length} candles. ` +
          `Progress: ${this.calculatePercent().toFixed(1)}%`
        );
      }
    } catch (err) {
      console.error(`[Backfill] Chunk failed, will retry:`, err);
    }

    // Schedule next chunk with cooldown pacing
    if (this.isRunning && !this.isPaused) {
      this.scheduleNextChunk(COOLDOWN_BASE_MS);
    }
  }

  private calculatePercent(): number {
    const totalGap = this.gapEndMs - this.gapStartMs;
    const fetched = this.gapEndMs - this.currentFetchEnd;
    return Math.min(100, (fetched / totalGap) * 100);
  }

  private reportProgress(isComplete: boolean): void {
    if (!this.progressCallback) return;
    const totalDays = LOOKBACK_MS / (24 * 60 * 60 * 1000);
    const percent = isComplete ? 100 : this.calculatePercent();
    const daysCovered = (percent / 100) * totalDays;

    this.progressCallback({
      symbol: this.currentSymbol,
      percent,
      daysCovered: parseFloat(daysCovered.toFixed(1)),
      totalDays,
      isPaused: this.isPaused,
      pauseReason: this.pauseReason || undefined,
      lastChunkTimestamp: this.currentFetchEnd,
    });
  }

  public getStatus(): BackfillProgress {
    const totalDays = LOOKBACK_MS / (24 * 60 * 60 * 1000);
    const percent = this.calculatePercent();
    return {
      symbol: this.currentSymbol,
      percent,
      daysCovered: parseFloat(((percent / 100) * totalDays).toFixed(1)),
      totalDays,
      isPaused: this.isPaused,
      pauseReason: this.pauseReason || undefined,
      lastChunkTimestamp: this.currentFetchEnd,
    };
  }
}

// Singleton — used by the hook and settings page
export const backfillEngine = new LazyBackfillEngine();
