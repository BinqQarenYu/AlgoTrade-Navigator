import { NextResponse } from 'next/server';
import { getHistoricalTrades } from '@/lib/db-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const limit = parseInt(searchParams.get('limit') || '100');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const trades = await getHistoricalTrades(symbol, limit);
    // Handle BigInt serialization for DuckDB results
    return new Response(JSON.stringify(trades, (_, value) => 
        typeof value === 'bigint' ? value.toString() : value
    ), {
        headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('[DB API ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
