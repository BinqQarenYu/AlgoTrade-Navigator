import { NextResponse, type NextRequest } from 'next/server';
import { getRecentSignals } from '@/lib/db-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!symbol) return NextResponse.json({ error: 'symbol is required' }, { status: 400 });

    const signals = await getRecentSignals(symbol, limit);

    // Calculate Bayesian Confidence (Win Rate / Loss Severity)
    const completed = signals.filter(s => s.outcome !== 'OPEN');
    const wins = completed.filter(s => s.outcome === 'WIN').length;
    const winRate = completed.length > 0 ? (wins / completed.length) : 0.5;

    return NextResponse.json({
      success: true,
      signals,
      stats: {
        winRate,
        sampleSize: completed.length,
        confidenceMultiplier: winRate > 0.6 ? 1.2 : winRate < 0.4 ? 0.8 : 1.0,
        modelStatus: winRate > 0.6 ? 'OPTIMIZED' : winRate < 0.4 ? 'CAUTION' : 'LEARNING'
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
