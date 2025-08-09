'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateSupertrend } from '@/lib/indicators';

export interface SupertrendParams {
  period: number;
  multiplier: number;
}

export const defaultSupertrendParams: SupertrendParams = {
  period: 10,
  multiplier: 3,
};

const supertrendStrategy: Strategy = {
  id: 'supertrend',
  name: 'Supertrend',
  description: 'A trend-following strategy that uses the Supertrend indicator to identify trend direction and generate signals on trend changes.',
  async calculate(data: HistoricalData[], params: SupertrendParams = defaultSupertrendParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;

    const { supertrend, direction } = calculateSupertrend(data, params.period, params.multiplier);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.supertrend = supertrend[i];
      d.supertrend_direction = direction[i];
      d.signal = null;

      if (i > 0 && direction[i-1] && direction[i]) {
        // Trend changed from downtrend to uptrend
        if (direction[i-1]! === -1 && direction[i]! === 1) {
          d.signal = 'BUY';
        }
        // Trend changed from uptrend to downtrend
        if (direction[i-1]! === 1 && direction[i]! === -1) {
          d.signal = 'SELL';
        }
      }
    });

    return dataWithIndicators;
  },
};

export default supertrendStrategy;
