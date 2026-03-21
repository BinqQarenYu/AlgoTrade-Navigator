'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { connectToDB, bufferTrades, bufferOHLCVBatch, TradeRecord, OHLCVRecord } from '@/lib/db-service';
import { updateSyncState } from '@/lib/sync-state-manager';

export async function POST(request: NextRequest) {
  try {
    const { source, symbol, data } = await request.json();

    if (!symbol || !data) {
      return NextResponse.json({ error: 'symbol and data are required' }, { status: 400 });
    }

    // Ensure DB is ready (idempotent)
    await connectToDB();

    // ── LIVE trades from WebSocket ──────────────────────────
    if (source === 'LIVE') {
      const records: TradeRecord[] = Array.isArray(data)
        ? data
        : [data];

      bufferTrades(
        records.map((r: any) => ({
          trade_id: String(r.trade_id || r.id || `${symbol}-${r.timestamp}-${Math.random()}`),
          symbol,
          price: Number(r.price),
          quantity: Number(r.quantity ?? r.qty ?? 0),
          side: r.side || (r.isBuyerMaker ? 'sell' : 'buy'),
          timestamp: Number(r.timestamp),
          source: 'LIVE' as const,
          entropy_score: r.microstructure?.entropyScore,
          vpin: r.microstructure?.vpin,
          is_synthetic: r.microstructure?.isSynthetic,
          is_organic: r.microstructure?.isOrganic,
          is_iceberg: r.microstructure?.isIceberg,
          is_spoofing: r.microstructure?.isSpoofing,
          funding_rate: r.microstructure?.fundingRate
        }))
      );

      // Update manifest's "newest" bookmark
      const newestTs = Math.max(...records.map(r => Number(r.timestamp)));
      const oldestTs = Math.min(...records.map(r => Number(r.timestamp)));
      updateSyncState(symbol, oldestTs, newestTs, records.length, false);

      return NextResponse.json({ success: true, buffered: records.length, source: 'LIVE' });
    }

    // ── BACKFILL OHLCV chunks from CCXT REST ────────────────
    if (source === 'BACKFILL' && Array.isArray(data)) {
      const ohlcvRecords: OHLCVRecord[] = data.map((k: any) => ({
        symbol,
        interval: k.interval || '1m',
        time: Number(k.time),
        open: Number(k.open),
        high: Number(k.high),
        low: Number(k.low),
        close: Number(k.close),
        volume: Number(k.volume),
        source: 'BACKFILL',
      }));

      bufferOHLCVBatch(ohlcvRecords);

      const times = ohlcvRecords.map(r => r.time);
      updateSyncState(symbol, Math.min(...times), Math.max(...times), ohlcvRecords.length, false);

      return NextResponse.json({ success: true, buffered: ohlcvRecords.length, source: 'BACKFILL' });
    }

    return NextResponse.json({ error: 'Unknown payload format' }, { status: 400 });

  } catch (error: any) {
    console.error('[DB SAVE ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
