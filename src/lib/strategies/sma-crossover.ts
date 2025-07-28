'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateSMA } from '@/lib/indicators';

export interface SmaCrossoverParams {
  shortPeriod: number;
  longPeriod: number;
  discipline: DisciplineParams;
}

export const defaultSmaCrossoverParams: SmaCrossoverParams = {
  shortPeriod: 20,
  longPeriod: 50,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const smaCrossoverStrategy: Strategy = {
  id: 'sma-crossover',
  name: 'SMA Crossover',
  description: 'A trend-following strategy that generates signals when a short-term SMA crosses a long-term SMA.',
  async calculate(data: HistoricalData[], userParams: Partial<SmaCrossoverParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultSmaCrossoverParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    if (data.length < params.longPeriod) return dataWithIndicators;

    const closePrices = data.map(d => d.close);
    const sma_short = calculateSMA(closePrices, params.shortPeriod);
    const sma_long = calculateSMA(closePrices, params.longPeriod);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.sma_short = sma_short[i];
      d.sma_long = sma_long[i];
      if (i > 0 && sma_short[i-1] && sma_long[i-1] && sma_short[i] && sma_long[i]) {
        if (sma_short[i-1] <= sma_long[i-1] && sma_short[i] > sma_long[i]) {
            d.bullish_event = true;
        }
        if (sma_short[i-1] >= sma_long[i-1] && sma_short[i] < sma_long[i]) {
            d.bearish_event = true;
        }
      }
    });
    return dataWithIndicators;
  },
};

export default smaCrossoverStrategy;
