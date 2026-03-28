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
  machine_id?: string; // Which machine generated this
  
  // Microstructure Metrics
  entropy_score?: number;
  vpin?: number;
  is_synthetic?: boolean;
  is_organic?: boolean;
  is_iceberg?: boolean;
  is_spoofing?: boolean;
  funding_rate?: number;
}


export interface SignalRecord {
  signal_id: string;
  timestamp: number;
  symbol: string;
  strategy_id: string;
  signal_type: 'BUY' | 'SELL';
  entry_price: number;
  exit_price?: number;
  outcome?: 'WIN' | 'LOSS' | 'OPEN';
  profit_delta?: number;
  feature_vector: string; // JSON snapshot of MFV
  machine_id?: string;
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
  machine_id?: string;
}

export interface MicrostructureEventRecord {
  event_id: string;
  timestamp: number;
  symbol: string;
  event_type: 'WHALE_TX' | 'ICEBERG' | 'SPOOF_CANCEL' | 'VPIN_SPIKE' | 'LIQUIDATION' | 'ENTROPY_SHIFT';
  price: number;
  volume_base: number;
  volume_usd: number;
  severity_score: number;
  metadata?: string;
  machine_id?: string;
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
const globalBuffers = globalThis as unknown as {
  tradeBuffer: TradeRecord[];
  ohlcvBuffer: OHLCVRecord[];
  systemLogBuffer: SystemLogRecord[];
  signalBuffer: SignalRecord[];
  microstructureEventBuffer: MicrostructureEventRecord[];
};

if (!globalBuffers.tradeBuffer) {
  globalBuffers.tradeBuffer = [];
  globalBuffers.ohlcvBuffer = [];
  globalBuffers.systemLogBuffer = [];
  globalBuffers.signalBuffer = [];
  globalBuffers.microstructureEventBuffer = [];
}

export function getBufferStatus() {
  return {
    trades: globalBuffers.tradeBuffer.length,
    ohlcv: globalBuffers.ohlcvBuffer.length,
    logs: globalBuffers.systemLogBuffer.length,
    signals: globalBuffers.signalBuffer.length,
    microstructure: globalBuffers.microstructureEventBuffer.length
  };
}

const FLUSH_INTERVAL_MS = 10_000;
let flushTimer: ReturnType<typeof setInterval> | null = null;

// ──────────────────────────────────────────────────────────
// Schema SQL
// ──────────────────────────────────────────────────────────
const SCHEMA_SQL = `
  -- Raw tick-by-tick trade data. Composite PK prevents duplicates
  -- when live WebSocket catches up to a backfill chunk.
  CREATE TABLE IF NOT EXISTS trades (
    trade_id      VARCHAR,
    symbol        VARCHAR NOT NULL,
    price         DOUBLE  NOT NULL,
    quantity      DOUBLE  NOT NULL,
    side          VARCHAR NOT NULL,
    timestamp     BIGINT  NOT NULL,
    source        VARCHAR NOT NULL,
    machine_id    VARCHAR,
    entropy_score DOUBLE,
    vpin          DOUBLE,
    is_synthetic  BOOLEAN,
    is_organic    BOOLEAN,
    is_iceberg    BOOLEAN,
    is_spoofing   BOOLEAN,
    funding_rate  DOUBLE,
    PRIMARY KEY (timestamp, trade_id)
  );

  -- OHLCV candle data for charting and AI simulations
  CREATE TABLE IF NOT EXISTS ohlcv (
    symbol     VARCHAR NOT NULL,
    interval   VARCHAR NOT NULL,
    time       BIGINT  NOT NULL,
    open       DOUBLE  NOT NULL,
    high       DOUBLE  NOT NULL,
    low        DOUBLE  NOT NULL,
    close      DOUBLE  NOT NULL,
    volume     DOUBLE  NOT NULL,
    source     VARCHAR NOT NULL,
    machine_id VARCHAR,
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

  -- AI Signals & Outcomes for Bayesian Feedback Loop
  CREATE TABLE IF NOT EXISTS signals (
    signal_id      VARCHAR PRIMARY KEY,
    timestamp      BIGINT  NOT NULL,
    symbol         VARCHAR NOT NULL,
    strategy_id    VARCHAR NOT NULL,
    signal_type    VARCHAR NOT NULL,
    entry_price    DOUBLE  NOT NULL,
    exit_price     DOUBLE,
    outcome        VARCHAR DEFAULT 'OPEN',
    profit_delta   DOUBLE,
    feature_vector VARCHAR, -- JSON snapshot of MFV
    machine_id     VARCHAR
  );

  -- Deep Microscopy: Retained high-IQ anomalies
  CREATE TABLE IF NOT EXISTS microstructure_events (
    event_id VARCHAR PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    symbol VARCHAR NOT NULL,
    event_type VARCHAR NOT NULL,
    price DOUBLE NOT NULL,
    volume_base DOUBLE NOT NULL,
    volume_usd DOUBLE NOT NULL,
    severity_score DOUBLE,
    metadata   VARCHAR,
    machine_id VARCHAR
  );
`;

// ──────────────────────────────────────────────────────────
// Connection Management
// ──────────────────────────────────────────────────────────
export function runQuery(query: string, params?: any[]): Promise<any[]> {
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

export async function updateSignalOutcome(
  signal_id: string, 
  outcome: 'WIN' | 'LOSS', 
  exit_price: number, 
  profit_delta: number
): Promise<void> {
  await connectToDB();
  const query = `
    UPDATE signals 
    SET outcome = ?, exit_price = ?, profit_delta = ? 
    WHERE signal_id = ?
  `;
  await runQuery(query, [outcome, exit_price, profit_delta, signal_id]);
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

        // ── Schema Migration: ensure machine_id column exists ──
        // Handles DBs created before machine_id was added to the schema.
        const migrations = [
          `ALTER TABLE microstructure_events ADD COLUMN IF NOT EXISTS machine_id VARCHAR;`,
          `ALTER TABLE trades ADD COLUMN IF NOT EXISTS machine_id VARCHAR;`,
          `ALTER TABLE signals ADD COLUMN IF NOT EXISTS machine_id VARCHAR;`,
        ];
        const runMigrations = (idx: number) => {
          if (idx >= migrations.length) {
            // All migrations done, continue to pragmas
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
            return;
          }
          globalForDuckDB.conn!.exec(migrations[idx], (migErr) => {
            if (migErr) console.warn(`[DuckDB Migration] ${migrations[idx]} -> ${migErr.message}`);
            runMigrations(idx + 1);
          });
        };
        runMigrations(0);
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
  globalBuffers.tradeBuffer.push(record);
}

export function bufferOHLCV(record: OHLCVRecord): void {
  globalBuffers.ohlcvBuffer.push(record);
}

export function bufferTrades(records: TradeRecord[]): void {
  globalBuffers.tradeBuffer.push(...records);
}


export function bufferSystemLog(record: SystemLogRecord): void {
  globalBuffers.systemLogBuffer.push(record);
}

export function bufferSystemLogs(records: SystemLogRecord[]): void {
  globalBuffers.systemLogBuffer.push(...records);
}

export function bufferSignal(record: SignalRecord): void {
  globalBuffers.signalBuffer.push(record);
}

export function bufferSignals(records: SignalRecord[]): void {
  globalBuffers.signalBuffer.push(...records);
}

export function bufferOHLCVBatch(records: OHLCVRecord[]): void {
  globalBuffers.ohlcvBuffer.push(...records);
}

export function bufferMicrostructureEvent(record: MicrostructureEventRecord): void {
  globalBuffers.microstructureEventBuffer.push(record);
}

export function bufferMicrostructureEvents(records: MicrostructureEventRecord[]): void {
  globalBuffers.microstructureEventBuffer.push(...records);
}

async function flushBuffers(): Promise<void> {
  if (!globalForDuckDB.conn) return;

  // --- Flush trades ---
  if (globalBuffers.tradeBuffer.length > 0) {
    const batch = globalBuffers.tradeBuffer.splice(0, globalBuffers.tradeBuffer.length);
    try {
      await runQuery(`
        INSERT OR IGNORE INTO trades (
          trade_id, symbol, price, quantity, side, timestamp, source, machine_id,
          entropy_score, vpin, is_synthetic, is_organic, is_iceberg, is_spoofing, funding_rate
        )
        VALUES ${batch.map(t => `(
          '${t.trade_id}', '${t.symbol}', ${t.price}, ${t.quantity}, '${t.side}', ${t.timestamp}, '${t.source}', '${t.machine_id || 'UNKNOWN'}',
          ${t.entropy_score ?? 'NULL'}, ${t.vpin ?? 'NULL'}, ${t.is_synthetic ?? 'NULL'}, 
          ${t.is_organic ?? 'NULL'}, ${t.is_iceberg ?? 'NULL'}, ${t.is_spoofing ?? 'NULL'}, ${t.funding_rate ?? 'NULL'}
        )`).join(',\n')};
      `);
    } catch (e) {
      console.error('[DuckDB Flush] Trade batch error:', e);
      // Return records to buffer so they can be retried
      globalBuffers.tradeBuffer.unshift(...batch);
    }
  }

  // --- Flush AI Signals (Bayesian Loop) ---
  if (globalBuffers.signalBuffer.length > 0) {
    const batch = globalBuffers.signalBuffer.splice(0, globalBuffers.signalBuffer.length);
    const values = batch
      .map(s => `(
        '${s.signal_id}', ${s.timestamp}, '${s.symbol}', '${s.strategy_id}', '${s.signal_type}', 
        ${s.entry_price}, ${s.exit_price ?? 'NULL'}, '${s.outcome || 'OPEN'}', 
        ${s.profit_delta ?? 'NULL'}, '${s.feature_vector.replace(/'/g, "''")}', '${s.machine_id || 'UNKNOWN'}'
      )`)
      .join(',\n');

    try {
      await runQuery(`
        INSERT OR IGNORE INTO signals (
          signal_id, timestamp, symbol, strategy_id, signal_type, 
          entry_price, exit_price, outcome, profit_delta, feature_vector, machine_id
        )
        VALUES ${values};
      `);
    } catch (e) {
      console.error('[DuckDB Flush] Signal batch error:', e);
      globalBuffers.signalBuffer.unshift(...batch);
    }
  }

  // --- Flush System Logs ---
  if (globalBuffers.systemLogBuffer.length > 0) {
    const batch = globalBuffers.systemLogBuffer.splice(0, globalBuffers.systemLogBuffer.length);
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
      globalBuffers.systemLogBuffer.unshift(...batch);
    }
  }

  // --- Flush OHLCV ---
  if (globalBuffers.ohlcvBuffer.length > 0) {
    const batch = globalBuffers.ohlcvBuffer.splice(0, globalBuffers.ohlcvBuffer.length);
    const values = batch
      .map(k => `('${k.symbol}', '${k.interval}', ${k.time}, ${k.open}, ${k.high}, ${k.low}, ${k.close}, ${k.volume}, '${k.source}', '${k.machine_id || 'UNKNOWN'}')`)
      .join(',\n');

    try {
      await runQuery(`
        INSERT OR IGNORE INTO ohlcv (symbol, interval, time, open, high, low, close, volume, source, machine_id)
        VALUES ${values};
      `);
    } catch (e) {
      console.error('[DuckDB Flush] OHLCV batch error:', e);
      globalBuffers.ohlcvBuffer.unshift(...batch);
    }
  }

  // --- Flush Microstructure Events ---
  if (globalBuffers.microstructureEventBuffer.length > 0) {
    const batch = globalBuffers.microstructureEventBuffer.splice(0, globalBuffers.microstructureEventBuffer.length);
    const values = batch
      .map(e => `('${e.event_id}', ${e.timestamp}, '${e.symbol}', '${e.event_type}', ${e.price}, ${e.volume_base}, ${e.volume_usd}, ${e.severity_score}, ${e.metadata ? `'${e.metadata.replace(/'/g, "''")}'` : 'NULL'}, '${e.machine_id || 'UNKNOWN'}')`)
      .join(',\n');

    console.log(`[DuckDB Flush] Attempting to insert ${batch.length} microstructure events... \n VALUES: ${values}`);
    try {
      await runQuery(`
        INSERT OR IGNORE INTO microstructure_events (event_id, timestamp, symbol, event_type, price, volume_base, volume_usd, severity_score, metadata, machine_id)
        VALUES ${values};
      `);
      console.log(`[DuckDB Flush] Inserted ${batch.length} microstructure events successfully.`);
    } catch (err) {
      console.error('[DuckDB Flush] Microstructure Event batch error:', err);
      globalBuffers.microstructureEventBuffer.unshift(...batch);
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
    bufferPending: globalBuffers.tradeBuffer.length + globalBuffers.ohlcvBuffer.length,
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


export async function getRecentSignals(symbol: string, limit: number = 10): Promise<SignalRecord[]> {
  await connectToDB();
  const query = `
    SELECT * FROM signals 
    WHERE symbol = ? 
    ORDER BY timestamp DESC 
    LIMIT ?
  `;
  const result = await runQuery(query, [symbol, limit]);
  return result as SignalRecord[];
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
