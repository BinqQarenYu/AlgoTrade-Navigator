'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateSupertrend } from '@/lib/indicators';

export interface SupertrendParams {
  period: number;
  multiplier: number;
  reverse?: boolean;
  discipline: DisciplineParams;
}

export const defaultSupertrendParams: SupertrendParams = {
  period: 10,
  multiplier: 3,
  reverse: false,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 2,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
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

      if (i > 0 && direction[i-1] && direction[i]) {
        // Trend changed from downtrend to uptrend
        const standardBuy = direction[i-1]! === -1 && direction[i]! === 1;
        // Trend changed from uptrend to downtrend
        const standardSell = direction[i-1]! === 1 && direction[i]! === -1;

        if (params.reverse) {
            if (standardBuy) d.sellSignal = d.high;
            if (standardSell) d.buySignal = d.low;
        } else {
            if (standardBuy) d.buySignal = d.low;
            if (standardSell) d.sellSignal = d.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default supertrendStrategy;
