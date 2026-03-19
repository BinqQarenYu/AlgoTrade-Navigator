import { NextResponse, type NextRequest } from 'next/server';
import { connectToDB, getStorageConfig, relocateDatabase, closeDB } from '@/lib/db-service';
import { getTimeline } from '@/lib/sync-state-manager';
import { backfillEngine } from '@/lib/lazy-backfill-worker';
import { binanceWSEngine } from '@/lib/binance-websocket-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';

    await connectToDB();
    const config = await getStorageConfig();
    const timeline = getTimeline(symbol);

    return NextResponse.json({ ...config, timeline });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, newPath } = await request.json();

    if (action === 'relocate') {
      if (!newPath) return NextResponse.json({ error: 'newPath required' }, { status: 400 });

      console.log('[DUCKDB] Relocating database to:', newPath);
      
      // 1. Pause WebSocket and Backfiller to release locks if needed
      // (relocateDatabase also closes the connection)
      backfillEngine.pause();
      if (binanceWSEngine) await binanceWSEngine.pause();

      // 2. Atomic relocation (flush -> close -> move -> reconnect)
      await relocateDatabase(newPath);

      // 3. Resume engines
      if (binanceWSEngine) binanceWSEngine.resume();
      backfillEngine.start();

      const config = await getStorageConfig();
      return NextResponse.json({ success: true, ...config });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('[DB CONFIG ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
