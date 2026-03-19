import { NextResponse } from 'next/server';
import { bufferSystemLog, getHistoricalSystemLogs, SystemLogRecord } from '@/lib/db-service';

export async function POST(req: Request) {
  try {
    const data: SystemLogRecord = await req.json();

    if (!data.id || !data.asset_pair || !data.message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Default missing fields
    data.timestamp = data.timestamp || Date.now();
    data.alert_source = data.alert_source || 'system';
    data.interval = data.interval || '1m';
    data.numerical_data = data.numerical_data || '{}';

    bufferSystemLog(data);

    return NextResponse.json({ success: true, message: 'Log buffered' }, { status: 200 });
  } catch (error) {
    console.error('Error saving system log:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const asset_pair = searchParams.get('asset_pair');
    const limitParam = searchParams.get('limit');

    if (!asset_pair) {
      return NextResponse.json({ error: 'Missing asset_pair parameter' }, { status: 400 });
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 100;
    const logs = await getHistoricalSystemLogs(asset_pair, limit);

    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    console.error('Error fetching system logs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
