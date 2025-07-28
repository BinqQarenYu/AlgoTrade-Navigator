'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateParabolicSAR } from '@/lib/indicators';

export interface ParabolicSarFlipParams {
  afStart: number;
  afIncrement: number;
  afMax: number;
  discipline: DisciplineParams;
}

export const defaultParabolicSarFlipParams: ParabolicSarFlipParams = {
  afStart: 0.02,
  afIncrement: 0.02,
  afMax: 0.2,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const parabolicSarFlipStrategy: Strategy = {
  id: 'parabolic-sar-flip',
  name: 'Parabolic SAR Flip',
  description: 'A trend-following strategy that enters a trade when the Parabolic SAR dots flip from one side of the price to the other.',
  async calculate(data: HistoricalData[], userParams: Partial<ParabolicSarFlipParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultParabolicSarFlipParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < 2) return dataWithIndicators;

    const { psar, direction } = calculateParabolicSAR(data, params.afStart, params.afIncrement, params.afMax);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.psar = psar[i];
      d.psar_direction = direction[i];

      if (i > 0 && direction[i-1] !== null && direction[i] !== null) {
        if (direction[i-1] === -1 && direction[i] === 1) {
          d.bullish_event = true;
        }
        if (direction[i-1] === 1 && direction[i] === -1) {
          d.bearish_event = true;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default parabolicSarFlipStrategy;
