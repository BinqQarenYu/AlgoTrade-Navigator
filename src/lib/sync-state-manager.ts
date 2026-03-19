/**
 * sync-state-manager.ts
 *
 * Manages the persistent sync manifest (sync_state.json) that tracks
 * exactly how far back historical data has been fetched per symbol.
 * This allows the Lazy-Backfill to survive app restarts without
 * re-downloading already captured data.
 */

import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const MANIFEST_PATH = path.join(DATA_DIR, 'sync_state.json');

export interface SymbolSyncState {
  symbol: string;
  /** The oldest timestamp (ms) that has been saved to DuckDB */
  oldestFetchedTimestamp: number;
  /** The newest timestamp (ms) that has been saved to DuckDB */
  newestFetchedTimestamp: number;
  /** ISO string of last update */
  lastUpdatedAt: string;
  /** Total records stored for this symbol */
  totalRecords: number;
  /** Whether the backfill is complete (reached target lookback) */
  backfillComplete: boolean;
}

export interface SyncManifest {
  version: number;
  config: {
    storage_path: string;
  };
  symbols: Record<string, SymbolSyncState>;
}

const DEFAULT_MANIFEST: SyncManifest = {
  version: 1,
  config: {
    storage_path: path.join(DATA_DIR, 'algo_trades.duckdb')
  },
  symbols: {},
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readManifest(): SyncManifest {
  ensureDataDir();
  try {
    if (!fs.existsSync(MANIFEST_PATH)) return { ...DEFAULT_MANIFEST };
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as SyncManifest;
    if (!parsed.config) parsed.config = { ...DEFAULT_MANIFEST.config };
    return parsed;
  } catch {
    return { ...DEFAULT_MANIFEST };
  }
}

export function writeManifest(manifest: SyncManifest): void {
  ensureDataDir();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
}

/** Legacy support for relocation engine in route.ts */
export function getSyncState(): SyncManifest {
    return readManifest();
}

/** Legacy support for relocation engine in route.ts */
export function updateConfigPath(newPath: string): void {
    const manifest = readManifest();
    manifest.config.storage_path = newPath;
    writeManifest(manifest);
}

export function getGap(
  symbol: string,
  lookbackMs: number = 60 * 24 * 60 * 60 * 1000
): { gapStartMs: number; gapEndMs: number } | null {
  const manifest = readManifest();
  const state = manifest.symbols[symbol];
  const now = Date.now();
  const targetStart = now - lookbackMs;

  if (!state) {
    return { gapStartMs: targetStart, gapEndMs: now };
  }

  if (state.backfillComplete) return null;

  if (state.oldestFetchedTimestamp > targetStart) {
    return {
      gapStartMs: targetStart,
      gapEndMs: state.oldestFetchedTimestamp,
    };
  }

  return null;
}

export function updateSyncState(
  symbol: string,
  newOldestTimestamp: number,
  newNewestTimestamp: number,
  recordsDelta: number,
  isComplete: boolean = false
): void {
  const manifest = readManifest();
  const existing = manifest.symbols[symbol];

  manifest.symbols[symbol] = {
    symbol,
    oldestFetchedTimestamp: existing
      ? Math.min(existing.oldestFetchedTimestamp, newOldestTimestamp)
      : newOldestTimestamp,
    newestFetchedTimestamp: existing
      ? Math.max(existing.newestFetchedTimestamp, newNewestTimestamp)
      : newNewestTimestamp,
    lastUpdatedAt: new Date().toISOString(),
    totalRecords: (existing?.totalRecords ?? 0) + recordsDelta,
    backfillComplete: isComplete,
  };

  writeManifest(manifest);
}

export function getTimeline(
  symbol: string,
  lookbackMs: number = 60 * 24 * 60 * 60 * 1000
): {
  targetStartMs: number;
  nowMs: number;
  coveredStartMs: number | null;
  coveredEndMs: number | null;
  gapPercent: number;
  coveredPercent: number;
} {
  const manifest = readManifest();
  const state = manifest.symbols[symbol];
  const now = Date.now();
  const targetStart = now - lookbackMs;

  if (!state) {
    return {
      targetStartMs: targetStart,
      nowMs: now,
      coveredStartMs: null,
      coveredEndMs: null,
      gapPercent: 100,
      coveredPercent: 0,
    };
  }

  const totalRange = now - targetStart;
  const coveredStart = Math.max(targetStart, state.oldestFetchedTimestamp);
  const coveredEnd = Math.min(now, state.newestFetchedTimestamp);
  const coveredRange = Math.max(0, coveredEnd - coveredStart);
  const coveredPercent = Math.min(100, (coveredRange / totalRange) * 100);

  return {
    targetStartMs: targetStart,
    nowMs: now,
    coveredStartMs: state.oldestFetchedTimestamp,
    coveredEndMs: state.newestFetchedTimestamp,
    gapPercent: Math.max(0, 100 - coveredPercent),
    coveredPercent,
  };
}
