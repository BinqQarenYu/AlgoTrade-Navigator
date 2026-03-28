import { NextResponse } from 'next/server';
import { runQuery, connectToDB } from '@/lib/db-service';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const hours = parseInt(searchParams.get('hours') || '24');
    const timeWindowMs = hours * 60 * 60 * 1000; 
    const cutoff = Date.now() - timeWindowMs;

    try {
        await connectToDB();
        // 1. Event Counts (For Manipulation Index & General Stats)
        const eventCounts = await runQuery(`
            SELECT event_type, count(*) as count, sum(volume_usd) as total_volume
            FROM microstructure_events
            WHERE symbol = '${symbol}' AND timestamp > ${cutoff}
            GROUP BY event_type
        `);

        // 2. Iceberg Heatmap
        const icebergs = await runQuery(`
            SELECT price, sum(volume_usd) as magnitude
            FROM microstructure_events
            WHERE symbol = '${symbol}' AND event_type = 'ICEBERG' AND timestamp > ${cutoff}
            GROUP BY price
            ORDER BY magnitude DESC
            LIMIT 50
        `);

        // 3. Bot Dominance (Entropy) Series - Grouped by 15-minute buckets
        const entropySeries = await runQuery(`
            SELECT 
                CAST((timestamp / 900000) * 900000 AS BIGINT) as time_bucket,
                avg(severity_score) as avg_entropy
            FROM microstructure_events
            WHERE symbol = '${symbol}' AND event_type = 'ENTROPY_SHIFT' AND timestamp > ${cutoff}
            GROUP BY time_bucket
            ORDER BY time_bucket ASC
        `);

        // 4. Smart Money Proxy (VPIN overrides) Series
        const vpinSeries = await runQuery(`
            SELECT 
                CAST((timestamp / 900000) * 900000 AS BIGINT) as time_bucket,
                avg(severity_score) as avg_vpin,
                avg(price) as avg_price
            FROM microstructure_events
            WHERE symbol = '${symbol}' AND event_type = 'VPIN_SPIKE' AND timestamp > ${cutoff}
            GROUP BY time_bucket
            ORDER BY time_bucket ASC
        `);
        
        // 5. Liquidations
        const liquidations = await runQuery(`
            SELECT timestamp, price, volume_usd, metadata
            FROM microstructure_events
            WHERE symbol = '${symbol}' AND event_type = 'LIQUIDATION' AND timestamp > ${cutoff}
            ORDER BY timestamp DESC
        `);

        const safeData = JSON.parse(JSON.stringify({
            symbol,
            cutoff,
            eventCounts,
            icebergs,
            entropySeries,
            vpinSeries,
            liquidations
        }, (key, value) => typeof value === 'bigint' ? value.toString() : value));

        return NextResponse.json({
            success: true,
            data: safeData
        });
    } catch (e: any) {
        if (e.message?.includes("Table with name microstructure_events does not exist")) {
             return NextResponse.json({ success: true, data: { eventCounts: [], icebergs: [], entropySeries: [], vpinSeries: [], liquidations: [] } });
        }
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
