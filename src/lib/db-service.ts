import duckdb from 'duckdb';
import path from 'path';
import fs from 'fs';

// Default DB location. Can be mutated via User Settings (UI).
let dbPath = process.env.DUCKDB_PATH || path.join(process.cwd(), 'data', 'algo_trades.duckdb');
let db: duckdb.Database | null = null;
let conn: duckdb.Connection | null = null;

/**
 * Ensures the specified directory exists and initializes the DuckDB connection.
 */
export const connectToDB = (customPath?: string): Promise<duckdb.Connection> => {
    return new Promise((resolve, reject) => {
        if (customPath && customPath !== dbPath) {
            // Re-mount request from settings UI
            if (db) {
                db.close();
                db = null;
                conn = null;
            }
            dbPath = customPath;
        }

        if (conn) {
            return resolve(conn);
        }

        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // Instantiate DuckDB optimized for fast analytics
        db = new duckdb.Database(dbPath, {
            'max_memory': '2GB', // protect app resources
            'threads': '4',
        }, (err) => {
            if (err) return reject(err);

            conn = db!.connect();
            
            // "Stitched" unified tables for AI gap analysis
            const initQuery = `
                CREATE TABLE IF NOT EXISTS market_data (
                    id VARCHAR PRIMARY KEY,
                    symbol VARCHAR,
                    time BIGINT,
                    open DOUBLE,
                    high DOUBLE,
                    low DOUBLE,
                    close DOUBLE,
                    volume DOUBLE,
                    source VARCHAR -- 'LIVE' or 'BACKFILL'
                );
                
                -- High volume raw trades
                CREATE TABLE IF NOT EXISTS live_trades (
                    id VARCHAR PRIMARY KEY,
                    symbol VARCHAR,
                    price DOUBLE,
                    quantity DOUBLE,
                    side VARCHAR,
                    timestamp BIGINT,
                    source VARCHAR
                );
            `;

            conn.exec("PRAGMA default_compression='zstd';" + initQuery, (execErr) => {
                if (execErr) reject(execErr);
                else resolve(conn!);
            });
        });
    });
};

/**
 * Get current DB configuration for the Settings UI
 */
export const getStorageConfig = () => {
    let sizeMb = 0;
    try {
        if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            sizeMb = parseFloat((stats.size / (1024 * 1024)).toFixed(2));
        }
    } catch(e) {}

    return {
        path: dbPath,
        sizeMb,
        isActive: db !== null
    };
};

/**
 * Safely closes the DuckDB connection.
 */
export const closeDB = (): void => {
    if (db) {
        db.close();
        db = null;
        conn = null;
    }
};
