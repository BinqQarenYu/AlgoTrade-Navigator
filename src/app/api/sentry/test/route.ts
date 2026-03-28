import { NextResponse } from 'next/server';
import { runQuery, connectToDB } from '@/lib/db-service';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await connectToDB();
        let insertError = null;
        try {
            await runQuery(`
                INSERT INTO microstructure_events (event_id, timestamp, symbol, event_type, price, volume_base, volume_usd, severity_score, metadata)
                VALUES ('test-${Math.random()}', 123456789, 'BTCUSDT', 'WHALE_TX', 50000, 2, 100000, 10, NULL);
            `);
        } catch (err: any) {
            insertError = err.message;
        }

        const trades = await runQuery(`SELECT count(*)::INT as count FROM trades`);
        const m_events = await runQuery(`SELECT count(*)::INT as count FROM microstructure_events`);
        const recent = await runQuery(`SELECT event_id, event_type, symbol, timestamp FROM microstructure_events ORDER BY timestamp DESC LIMIT 5`);
        
        // Sanitize any BigInts returned by DuckDB
        const safeData = JSON.parse(JSON.stringify({ trades, m_events, recent, insertError }, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json({ success: true, data: safeData });
    } catch (e: any) {
         return NextResponse.json({ success: false, error: e.message });
    }
}
