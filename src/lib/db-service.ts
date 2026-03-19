/**
 * db-service.ts (Production Rewrite)
 *
 * Professional-grade DuckDB vault with:
 * - Composite PK (timestamp, trade_id) to prevent backfill/live stitching duplicates
 * - 10-second memory buffer flush for SSD longevity
 * - PRAGMA threads=4 for concurrent AI simulation reads
 * - Atomic database relocation support
 */

// 'server-only' ensures Next.js App Router / RSC compiler treats this module as strictly
// server-side, enabling serverExternalPackages to correctly externalize duckdb+deps at build time.
import 'server-only';
import type * as DuckDBType from 'duckdb';
// Use eval('require') to bypass Webpack's build-time analysis for native modules.
const duckdb: typeof DuckDBType = typeof window === 'undefined' ? eval('require')('duckdb') : null;
import path from 'path';
import fs from 'fs';
import { readManifest, updateConfigPath } from './sync-state-manager';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────
export interface TradeRecord {
  trade_id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  timestamp: number; // Unix ms
  source: 'LIVE' | 'BACKFILL';
}


export interface SystemLogRecord {
  id: string;
  timestamp: number;
  asset_pair: string;
  alert_source: string;
  interval: string;
  numerical_data: string;
  message: string;
}

export interface OHLCVRecord {
  symbol: string;
  interval: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: 'LIVE' | 'BACKFILL';
}

// ──────────────────────────────────────────────────────────
// State
// ──────────────────────────────────────────────────────────
const DEFAULT_PATH = path.join(process.cwd(), 'data', 'algo_trades.duckdb');

// Use globalThis to persist connection across HMR reloads
const globalForDuckDB = globalThis as unknown as {
  db: DuckDBType.Database | null;
  conn: DuckDBType.Connection | null;
  isInitialized: boolean;
  dbPath: string;
};

if (!globalForDuckDB.dbPath) {
  globalForDuckDB.dbPath = process.env.DUCKDB_PATH || readManifest().config.storage_path || DEFAULT_PATH;
}

// In-memory write buffers — flushed every 10s
const tradeBuffer: TradeRecord[] = [];
const ohlcvBuffer: OHLCVRecord[] = [];

const systemLogBuffer: SystemLogRecord[] = [];

const FLUSH_INTERVAL_MS = 10_000;
let flushTimer: ReturnType<typeof setInterval> | null = null;

// ──────────────────────────────────────────────────────────
// Schema SQL
// ──────────────────────────────────────────────────────────
const SCHEMA_SQL = `
  -- Raw tick-by-tick trade data. Composite PK prevents duplicates
  -- when live WebSocket catches up to a backfill chunk.
  CREATE TABLE IF NOT EXISTS trades (
    trade_id  VARCHAR,
    symbol    VARCHAR NOT NULL,
    price     DOUBLE  NOT NULL,
    quantity  DOUBLE  NOT NULL,
    side      VARCHAR NOT NULL,
    timestamp BIGINT  NOT NULL,
    source    VARCHAR NOT NULL,
    PRIMARY KEY (timestamp, trade_id)
  );

  -- OHLCV candle data for charting and AI simulations
  CREATE TABLE IF NOT EXISTS ohlcv (
    symbol   VARCHAR NOT NULL,
    interval VARCHAR NOT NULL,
    time     BIGINT  NOT NULL,
    open     DOUBLE  NOT NULL,
    high     DOUBLE  NOT NULL,
    low      DOUBLE  NOT NULL,
    close    DOUBLE  NOT NULL,
    volume   DOUBLE  NOT NULL,
    source   VARCHAR NOT NULL,
    PRIMARY KEY (symbol, interval, time)
  );

  -- App metadata / backfill state

  -- System logs for persistent per-asset memory
  CREATE TABLE IF NOT EXISTS system_logs (
    id VARCHAR PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    asset_pair VARCHAR NOT NULL,
    alert_source VARCHAR NOT NULL,
    interval VARCHAR NOT NULL,
    numerical_data VARCHAR,
    message VARCHAR NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_meta (
    key   VARCHAR PRIMARY KEY,
    value VARCHAR
  );
`;

// ──────────────────────────────────────────────────────────
// Connection Management
// ──────────────────────────────────────────────────────────
function runQuery(query: string, params?: any[]): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (!globalForDuckDB.conn) return reject(new Error('DuckDB not connected'));
    const cb = (err: Error | null, res: any[]) => err ? reject(err) : resolve(res || []);
    if (params && params.length > 0) {
      globalForDuckDB.conn.all(query, ...params, cb);
    } else {
      globalForDuckDB.conn.all(query, cb);
    }
  });
}

export async function connectToDB(customPath?: string): Promise<void> {
  // Handle relocation request
  if (customPath && customPath !== globalForDuckDB.dbPath) {
    await closeDB();
    globalForDuckDB.dbPath = customPath;
  }

  if (globalForDuckDB.isInitialized && globalForDuckDB.conn) return;

  const dir = path.dirname(globalForDuckDB.dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await new Promise<void>((resolve, reject) => {
    globalForDuckDB.db = new duckdb!.Database(globalForDuckDB.dbPath, (err) => {
      if (err) return reject(err);
      globalForDuckDB.conn = globalForDuckDB.db!.connect();

      globalForDuckDB.conn.exec(SCHEMA_SQL, (schemaErr) => {
        if (schemaErr) return reject(schemaErr);
        // Optimise for AI concurrency
        globalForDuckDB.conn!.exec(`
          PRAGMA threads=4;
          PRAGMA memory_limit='2GB';
          PRAGMA default_compression='zstd';
        `, (pragmaErr) => {
          if (pragmaErr) console.warn('[DuckDB] Pragma warning:', pragmaErr);
          globalForDuckDB.isInitialized = true;
          startFlushTimer();
          resolve();
        });
      });
    });
  });
}

export async function closeDB(): Promise<void> {
  stopFlushTimer();
  await flushBuffers(); // Final flush before close
  return new Promise((resolve) => {
    if (globalForDuckDB.db) {
      globalForDuckDB.db.close(() => {
        globalForDuckDB.db = null;
        globalForDuckDB.conn = null;
        globalForDuckDB.isInitialized = false;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// ──────────────────────────────────────────────────────────
// Buffered Write System (10s flush for SSD longevity)
// ──────────────────────────────────────────────────────────
export function bufferTrade(record: TradeRecord): void {
  tradeBuffer.push(record);
}

export function bufferOHLCV(record: OHLCVRecord): void {
  ohlcvBuffer.push(record);
}

export function bufferTrades(records: TradeRecord[]): void {
  tradeBuffer.push(...records);
}


export function bufferSystemLog(record: SystemLogRecord): void {
  systemLogBuffer.push(record);
}

export function bufferSystemLogs(records: SystemLogRecord[]): void {
  systemLogBuffer.push(...records);
}

export function bufferOHLCVBatch(records: OHLCVRecord[]): void {
  ohlcvBuffer.push(...records);
}

async function flushBuffers(): Promise<void> {
  if (!globalForDuckDB.conn) return;

  // --- Flush trades ---
  if (tradeBuffer.length > 0) {
    const batch = tradeBuffer.splice(0, tradeBuffer.length);
    const values = batch
      .map(t => `('${t.trade_id}', '${t.symbol}', ${t.price}, ${t.quantity}, '${t.side}', ${t.timestamp}, '${t.source}')`)
      .join(',\n');

    try {
      await runQuery(`
        INSERT OR IGNORE INTO trades (trade_id, symbol, price, quantity, side, timestamp, source)
        VALUES ${values};
      `);
    } catch (e) {
      console.error('[DuckDB Flush] Trade batch error:', e);
      // Return records to buffer so they can be retried
      tradeBuffer.unshift(...batch);
    }
  }


  // --- Flush System Logs ---
  if (systemLogBuffer.length > 0) {
    const batch = systemLogBuffer.splice(0, systemLogBuffer.length);
    const values = batch
      .map(l => `('${l.id}', ${l.timestamp}, '${l.asset_pair}', '${l.alert_source}', '${l.interval}', '${l.numerical_data.replace(/'/g, "''")}', '${l.message.replace(/'/g, "''")}')`)
      .join(',\n');

    try {
      await runQuery(`
        INSERT OR IGNORE INTO system_logs (id, timestamp, asset_pair, alert_source, interval, numerical_data, message)
        VALUES ${values};
      `);
    } catch (e) {
      console.error('[DuckDB Flush] SystemLog batch error:', e);
      systemLogBuffer.unshift(...batch);
    }
  }

  // --- Flush OHLCV ---
  if (ohlcvBuffer.length > 0) {
    const batch = ohlcvBuffer.splice(0, ohlcvBuffer.length);
    const values = batch
      .map(k => `('${k.symbol}', '${k.interval}', ${k.time}, ${k.open}, ${k.high}, ${k.low}, ${k.close}, ${k.volume}, '${k.source}')`)
      .join(',\n');

    try {
      await runQuery(`
        INSERT OR IGNORE INTO ohlcv (symbol, interval, time, open, high, low, close, volume, source)
        VALUES ${values};
      `);
    } catch (e) {
      console.error('[DuckDB Flush] OHLCV batch error:', e);
      ohlcvBuffer.unshift(...batch);
    }
  }
}

function startFlushTimer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    flushBuffers().catch(e => console.error('[DuckDB AutoFlush]', e));
  }, FLUSH_INTERVAL_MS);
}

function stopFlushTimer(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

// ──────────────────────────────────────────────────────────
// Public Queries
// ──────────────────────────────────────────────────────────
export async function getStorageConfig() {
  let sizeMb = 0;
  try {
    if (fs.existsSync(globalForDuckDB.dbPath)) {
      const stats = fs.statSync(globalForDuckDB.dbPath);
      sizeMb = parseFloat((stats.size / (1024 * 1024)).toFixed(2));
    }
  } catch {}

  let tradeCount = 0;
  let oldestTimestamp: number | null = null;
  let newestTimestamp: number | null = null;
  try {
    if (globalForDuckDB.isInitialized) {
      const result = await runQuery(`
        SELECT COUNT(*) as cnt, MIN(timestamp) as oldest, MAX(timestamp) as newest
        FROM trades
      `);
      if (result[0]) {
        tradeCount = Number(result[0].cnt);
        oldestTimestamp = result[0].oldest ? Number(result[0].oldest) : null;
        newestTimestamp = result[0].newest ? Number(result[0].newest) : null;
      }
    }
  } catch {}

  return {
    path: globalForDuckDB.dbPath,
    sizeMb,
    isActive: globalForDuckDB.isInitialized,
    tradeCount,
    oldestTimestamp,
    newestTimestamp,
    bufferPending: tradeBuffer.length + ohlcvBuffer.length,
  };
}

/**
 * Atomic database relocation:
 * 1. Flush all pending writes
 * 2. Close the DB connection
 * 3. Move the .duckdb file to new path
 * 4. Reopen at new path
 */
export async function relocateDatabase(newPath: string): Promise<void> {
  const oldPath = globalForDuckDB.dbPath;
  
  // Final flush before close
  await closeDB();

  // Move the file
  const newDir = path.dirname(newPath);
  if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true });

  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    // Also move WAL file if it exists
    const walPath = oldPath + '.wal';
    if (fs.existsSync(walPath)) {
      fs.renameSync(walPath, newPath + '.wal');
    }
  }

  // Update manifest config so it survives app restart
  updateConfigPath(newPath);

  // Remount at new path (connectToDB will update dbPath internally)
  await connectToDB(newPath);
}

export async function getHistoricalTrades(symbol: string, limit: number = 100): Promise<TradeRecord[]> {
  await connectToDB();
  const query = `
    SELECT * FROM trades 
    WHERE symbol = ? 
    ORDER BY timestamp DESC 
    LIMIT ?
  `;
  const result = await runQuery(query, [symbol, limit]);
  return result as TradeRecord[];
}

export async function getHistoricalOHLCV(symbol: string, interval: string, startTime: number, endTime: number): Promise<OHLCVRecord[]> {
  await connectToDB();
  const query = `
    SELECT * FROM ohlcv
    WHERE symbol = ? AND interval = ? AND time >= ? AND time <= ?
    ORDER BY time ASC
  `;
  const result = await runQuery(query, [symbol, interval, startTime, endTime]);
  return result as OHLCVRecord[];
}


export async function getHistoricalSystemLogs(asset_pair: string, limit: number = 100): Promise<SystemLogRecord[]> {
  await connectToDB();
  const query = `
    SELECT * FROM system_logs
    WHERE asset_pair = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `;
  const result = await runQuery(query, [asset_pair, limit]);
  return result as SystemLogRecord[];
}
