import { NextResponse, type NextRequest } from 'next/server';
import { connectToDB, bufferSignal, SignalRecord } from '@/lib/db-service';

export async function POST(request: NextRequest) {
  try {
    const signal: SignalRecord = await request.json();

    if (!signal.signal_id || !signal.symbol || !signal.strategy_id) {
      return NextResponse.json({ error: 'Missing required signal fields' }, { status: 400 });
    }

    await connectToDB();
    
    // Buffer for DuckDB flush (10s window)
    bufferSignal({
      ...signal,
      timestamp: signal.timestamp || Date.now(),
      outcome: signal.outcome || 'OPEN'
    });

    return NextResponse.json({ success: true, signal_id: signal.signal_id });
  } catch (error: any) {
    console.error('[SIGNAL LOG ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { signal_id, outcome, exit_price, profit_delta } = await request.json();

    if (!signal_id || !outcome || exit_price === undefined) {
      return NextResponse.json({ error: 'signal_id, outcome, and exit_price are required' }, { status: 400 });
    }

    const { updateSignalOutcome } = await import('@/lib/db-service');
    await updateSignalOutcome(signal_id, outcome, Number(exit_price), Number(profit_delta || 0));
    
    return NextResponse.json({ success: true, updated: signal_id });
  } catch (error: any) {
    console.error('[SIGNAL UPDATE ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
