'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateSMA } from '@/lib/indicators';

const smaCrossoverStrategy: Strategy = {
  id: 'sma-crossover',
  name: 'SMA Crossover',
  description: 'A trend-following strategy that generates signals when a short-term SMA crosses a long-term SMA.',
  async calculate(data: HistoricalData[]): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    if (data.length < 50) return dataWithIndicators;

    const closePrices = data.map(d => d.close);
    const sma_short = calculateSMA(closePrices, 20);
    const sma_long = calculateSMA(closePrices, 50);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.sma_short = sma_short[i];
      d.sma_long = sma_long[i];
      if (i > 0 && sma_short[i-1] && sma_long[i-1] && sma_short[i] && sma_long[i]) {
        if (sma_short[i-1] <= sma_long[i-1] && sma_short[i] > sma_long[i]) d.buySignal = d.low;
        if (sma_short[i-1] >= sma_long[i-1] && sma_short[i] < sma_long[i]) d.sellSignal = d.high;
      }
    });
    return dataWithIndicators;
  },
};

export default smaCrossoverStrategy;
