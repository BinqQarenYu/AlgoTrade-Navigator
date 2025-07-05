'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateSMA } from '@/lib/indicators';

export interface SmaCrossoverParams {
  shortPeriod: number;
  longPeriod: number;
}

export const defaultSmaCrossoverParams: SmaCrossoverParams = {
  shortPeriod: 20,
  longPeriod: 50,
};

const smaCrossoverStrategy: Strategy = {
  id: 'sma-crossover',
  name: 'SMA Crossover',
  description: 'A trend-following strategy that generates signals when a short-term SMA crosses a long-term SMA.',
  async calculate(data: HistoricalData[], params: SmaCrossoverParams = defaultSmaCrossoverParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    if (data.length < params.longPeriod) return dataWithIndicators;

    const closePrices = data.map(d => d.close);
    const sma_short = calculateSMA(closePrices, params.shortPeriod);
    const sma_long = calculateSMA(closePrices, params.longPeriod);

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
