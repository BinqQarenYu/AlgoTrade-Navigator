'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateMomentum } from '@/lib/indicators';

export interface MomentumCrossParams {
  period: number;
  discipline: DisciplineParams;
}

export const defaultMomentumCrossParams: MomentumCrossParams = {
  period: 14,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const momentumCrossStrategy: Strategy = {
  id: 'momentum-cross',
  name: 'Momentum Zero-Line Cross',
  description: 'A simple strategy that enters when momentum crosses the zero line, indicating a potential trend change.',
  async calculate(data: HistoricalData[], userParams: Partial<MomentumCrossParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultMomentumCrossParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;

    const closePrices = data.map(d => d.close);
    const momentum = calculateMomentum(closePrices, params.period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.momentum = momentum[i];
      if (i > 0 && momentum[i-1] !== null && momentum[i] !== null) {
        if (momentum[i-1]! <= 0 && momentum[i]! > 0) {
          d.bullish_event = true;
        }
        if (momentum[i-1]! >= 0 && momentum[i]! < 0) {
          d.bearish_event = true;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default momentumCrossStrategy;
