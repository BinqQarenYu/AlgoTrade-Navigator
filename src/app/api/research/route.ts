import { NextResponse } from 'next/server';
import { predictMarket } from '@/ai/flows/predict-market-flow';
import { createDualApiService } from '@/lib/dual-coin-api-service';

const dualApiService = createDualApiService();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol } = body;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    // 1. Fetch recent data (klines)
    // We want ~30 candles for the prompt
    let recentData: any[] = [];
    try {
      const klines = await dualApiService.getHistoricalData(symbol, '1h', 30);
      if (klines && klines.length > 0) {
        recentData = klines;
      }
    } catch (e) {
      console.warn("Failed to fetch klines for research:", e);
    }

    // Convert klines to a simple JSON string to save tokens
    const recentDataString = JSON.stringify(recentData.map((k: any) => ({
      t: k.time,
      o: k.open,
      h: k.high,
      l: k.low,
      c: k.close,
      v: k.volume
    })));

    // 2. Fetch basic market details 
    const marketDetails = {
      marketCap: 0, 
      volume24h: 0,
      circulatingSupply: 1
    };

    // 3. Call Genkit Flow
    const result = await predictMarket({
      symbol,
      recentData: recentDataString,
      marketDetails
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Research API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to perform research' },
      { status: 500 }
    );
  }
}
