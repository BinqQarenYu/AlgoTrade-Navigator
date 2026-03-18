import { NextResponse, type NextRequest } from 'next/server';
import { getStorageConfig, connectToDB, closeDB } from '@/lib/db-service';
import { updateSyncState } from '@/lib/sync-state-manager';
import fs from 'fs';
import path from 'path';


import { backfillEngine } from '@/lib/lazy-backfill-worker';
import { binanceWSEngine } from '@/lib/binance-websocket-service';

export async function GET() {
    try {
        const config = getStorageConfig();
        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to read config' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { newPath } = await request.json();
        if (!newPath) return NextResponse.json({ error: 'Path required' }, { status: 400 });

        const config = getStorageConfig();
        const oldPath = config.path;

        if (oldPath === newPath) {
             return NextResponse.json({ success: true, path: newPath });
        }

        // 1. Pause WebSocket and Backfiller
        console.log('[DUCKDB] Pausing stream engines...');
        backfillEngine.pause();
        await binanceWSEngine.pause();

        // 2. Explicitly close DB so the file locks are released
        console.log('[DUCKDB] Closing DB connection...');
        closeDB();

        // 3. Move the physical files (DuckDB uses .duckdb and .duckdb.wal)
        console.log('[DUCKDB] Moving physical files...');

        // Ensure new directory exists
        const dir = path.dirname(newPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);
        }
        if (fs.existsSync(oldPath + '.wal')) {
            fs.renameSync(oldPath + '.wal', newPath + '.wal');
        }

        // 4. Update the manifest (sync_state.json)
        console.log('[DUCKDB] Updating manifest state...');
        updateSyncState({ config: { storage_path: newPath } });

        // 5. Reconnect to the new path
        console.log('[DUCKDB] Reconnecting to new DB path...');
        await connectToDB(newPath);

        // 6. Resume engines
        console.log('[DUCKDB] Resuming engines...');
        binanceWSEngine.resume();
        backfillEngine.start();

        return NextResponse.json({ success: true, path: newPath });
    } catch (error: any) {
        console.error('[DUCKDB] Relocation Error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
