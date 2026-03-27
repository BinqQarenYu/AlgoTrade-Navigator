import { NextResponse } from 'next/server';
import { runQuery, connectToDB } from '@/lib/db-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await connectToDB();
    let result: any[] = [];
    try {
      // DuckDB arg_max lets us easily fetch the numerical_data associated with the latest timestamp per sentry
      result = await runQuery(`
        SELECT 
          alert_source as sentry_id, 
          MAX(timestamp) as timestamp, 
          arg_max(numerical_data, timestamp) as numerical_data
        FROM system_logs
        WHERE asset_pair = 'HEARTBEAT'
          AND (alert_source LIKE 'sentry-%' 
           OR alert_source LIKE 'SENTINEL-%' 
           OR alert_source = 'ORANGE_PI_NODE')
        GROUP BY alert_source
        ORDER BY alert_source ASC;
      `);
    } catch (e) {
      console.error('[status route] Table error:', e);
    }

    if (result.length > 0) {
      const sentries = result.map((row) => {
        const lastCheckIn = Number(row.timestamp);
        const isOnline = (Date.now() - lastCheckIn) < 30000; // 30 seconds threshold
        
        let processedCount = 0;
        let bufferSize = 0;
        try {
            const data = JSON.parse(row.numerical_data || '{}');
            processedCount = data.processed || 0;
            bufferSize = data.buffer_remaining || 0;
            const assetCount = data.asset_count || 0;
            return {
              id: row.sentry_id,
              online: isOnline,
              lastCheckIn,
              processedCount,
              bufferSize,
              assetCount
            };
        } catch (e) {
            return {
              id: row.sentry_id,
              online: isOnline,
              lastCheckIn,
              processedCount,
              bufferSize,
              assetCount: 0
            };
        }
      });

      return NextResponse.json({
        fleet_status: sentries.some(s => s.online) ? 'active' : 'offline',
        sentries
      });
    }

    return NextResponse.json({
      fleet_status: 'offline',
      sentries: []
    });
  } catch (error) {
    console.error('Sentry Fleet Status Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
