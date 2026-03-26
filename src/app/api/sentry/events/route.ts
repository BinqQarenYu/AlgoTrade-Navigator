import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/db-service';

export async function GET() {
    try {
        const query = `
            SELECT event_id, timestamp, symbol, event_type, price, volume_usd, severity_score, metadata
            FROM microstructure_events
            ORDER BY timestamp DESC
            LIMIT 20
        `;
        const results = await runQuery(query);
        return NextResponse.json({ success: true, events: results });
    } catch (e: any) {
        // If table doesn't exist yet, return empty
        if (e.message?.includes("Table with name microstructure_events does not exist")) {
             return NextResponse.json({ success: true, events: [] });
        }
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
