import { NextResponse } from 'next/server';
import { runQuery, connectToDB } from '@/lib/db-service';

/**
 * /api/db/news
 * 
 * Retrieves all external_events (News, Gossip, Macro dates) 
 * prioritizing timestamps and impact scores.
 * Uses pagination to handle large datasets (O(1) memory).
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const minScore = parseFloat(searchParams.get('minScore') || '0');

    try {
        await connectToDB();

        // 1. Get total count for pagination
        const countRes = await runQuery(`
            SELECT count(*) as total 
            FROM external_events
            WHERE relevance_score >= ?
        `, [minScore]);
        
        const totalRows = countRes && countRes.length > 0 ? Number(countRes[0].total) : 0;

        // 2. Fetch the paginated dataset
        const news = await runQuery(`
            SELECT event_id, timestamp, source, level, relevance_score, headline, asset_scope, metadata 
            FROM external_events 
            WHERE relevance_score >= ?
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        `, [minScore, limit, offset]);

        // Clean up BigInts for JSON serialization
        const safeData = JSON.parse(JSON.stringify({
            total: totalRows,
            events: news
        }, (key, value) => typeof value === 'bigint' ? value.toString() : value));

        return NextResponse.json({
            success: true,
            data: safeData
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
