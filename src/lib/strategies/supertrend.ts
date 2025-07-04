'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateSupertrend } from '@/lib/indicators';

const supertrendStrategy: Strategy = {
  id: 'supertrend',
  name: 'Supertrend',
  description: 'A trend-following strategy that uses the Supertrend indicator to identify trend direction and generate signals on trend changes.',
  async calculate(data: HistoricalData[]): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const period = 10;
    const multiplier = 3;

    if (data.length < period) return dataWithIndicators;

    const { supertrend, direction } = calculateSupertrend(data, period, multiplier);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.supertrend = supertrend[i];
      d.supertrend_direction = direction[i];

      if (i > 0 && direction[i-1] && direction[i]) {
        // Trend changed from downtrend to uptrend
        if (direction[i-1]! === -1 && direction[i]! === 1) {
          d.buySignal = d.low;
        }
        // Trend changed from uptrend to downtrend
        if (direction[i-1]! === 1 && direction[i]! === -1) {
          d.sellSignal = d.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default supertrendStrategy;
