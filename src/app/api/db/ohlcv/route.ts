import { NextResponse } from 'next/server';
import { getHistoricalOHLCV } from '@/lib/db-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const interval = searchParams.get('interval');
  const startTime = searchParams.get('startTime');
  const endTime = searchParams.get('endTime');

  if (!symbol || !interval || !startTime || !endTime) {
    return NextResponse.json(
      { error: 'Symbol, interval, startTime, and endTime are required' },
      { status: 400 }
    );
  }

  try {
    const ohlcv = await getHistoricalOHLCV(
      symbol,
      interval,
      parseInt(startTime),
      parseInt(endTime)
    );
    // Handle BigInt serialization for DuckDB results
    return new Response(
      JSON.stringify(ohlcv, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[DB API ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
