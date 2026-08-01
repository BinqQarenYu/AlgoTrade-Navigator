export const runtime = 'nodejs';
import { NextResponse, type NextRequest } from 'next/server';
import { connectToDB } from '@/lib/db-service';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const payload = await request.json();
        
        // This accepts BOTH stitched klines (chunks) and single aggTrades (live)
        const { source, symbol, data } = payload;
        
        if (!data) return NextResponse.json({ success: false, error: 'No data provided' }, { status: 400 });

        const conn = await connectToDB();

        // 1. Is this a Backfill Batch of CCXT Klines?
        if (source === 'BACKFILL' && Array.isArray(data)) {
            // Using a parameterized statement to prevent injection and speed up large inserts natively
            const stmt = conn.prepare(`
                INSERT INTO market_data (id, symbol, time, open, high, low, close, volume, source) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET 
                close = excluded.close, volume = excluded.volume;
            `);
            
            for (let i = 0; i < data.length; i++) {
                const k = data[i];
                // Unique composite PK so AI doesn't see overlapping candles
                const id = `${symbol}-${k.time}`;
                stmt.run(id, symbol, k.time, k.open, k.high, k.low, k.close, k.volume, 'BACKFILL');
            }
            stmt.finalize();
            return NextResponse.json({ success: true, count: data.length });
        }
        
        // 2. Is this the Live Edge priority stream?
        if (source === 'LIVE') {
            const stmt = conn.prepare(`
                INSERT INTO live_trades (id, symbol, price, quantity, side, timestamp, source)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO NOTHING;
            `);
            
            // Single burst
            if (!Array.isArray(data)) {
                 stmt.run(data.id || crypto.randomUUID(), symbol, data.price, data.quantity, data.side, data.timestamp, 'LIVE');
            } else {
                 for (let i = 0; i < data.length; i++) {
                     const t = data[i];
                     stmt.run(t.id || crypto.randomUUID(), symbol, t.price, t.quantity, t.side, t.timestamp, 'LIVE');
                 }
            }
            stmt.finalize();
            return NextResponse.json({ success: true, liveStitched: true });
        }

        return NextResponse.json({ success: false, error: 'Unknown payload format' }, { status: 400 });
        
    } catch (error: any) {
        console.error('[DUCKDB SAVE ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
