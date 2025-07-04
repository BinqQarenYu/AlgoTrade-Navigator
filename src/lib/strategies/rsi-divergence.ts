'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateRSI } from '@/lib/indicators';

const rsiDivergenceStrategy: Strategy = {
  id: 'rsi-divergence',
  name: 'RSI Divergence',
  description: 'A mean-reversion strategy that identifies overbought and oversold conditions using the RSI indicator.',
  async calculate(data: HistoricalData[]): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    if (data.length < 15) return dataWithIndicators;
    
    const closePrices = data.map(d => d.close);
    const rsi = calculateRSI(closePrices, 14);
    const oversold = 30;
    const overbought = 70;

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.rsi = rsi[i];
       if (i > 0 && rsi[i-1] && rsi[i]) {
        if (rsi[i-1] <= oversold && rsi[i] > oversold) d.buySignal = d.low;
        if (rsi[i-1] >= overbought && rsi[i] < overbought) d.sellSignal = d.high;
      }
    });

    return dataWithIndicators;
  },
};

export default rsiDivergenceStrategy;
