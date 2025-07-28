'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateSupertrend } from '@/lib/indicators';

export interface SupertrendParams {
  period: number;
  multiplier: number;
  discipline: DisciplineParams;
}

export const defaultSupertrendParams: SupertrendParams = {
  period: 10,
  multiplier: 3,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const supertrendStrategy: Strategy = {
  id: 'supertrend',
  name: 'Supertrend',
  description: 'A trend-following strategy that uses the Supertrend indicator to identify trend direction and generate signals on trend changes.',
  async calculate(data: HistoricalData[], userParams: Partial<SupertrendParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultSupertrendParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;

    const { supertrend, direction } = calculateSupertrend(data, params.period, params.multiplier);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.supertrend = supertrend[i];
      d.supertrend_direction = direction[i];

      if (i > 0 && direction[i-1] && direction[i]) {
        if (direction[i-1]! === -1 && direction[i]! === 1) {
          d.bullish_event = true;
        }
        if (direction[i-1]! === 1 && direction[i]! === -1) {
          d.bearish_event = true;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default supertrendStrategy;
