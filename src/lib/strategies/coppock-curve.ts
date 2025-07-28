'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateCoppockCurve } from '@/lib/indicators';

export interface CoppockCurveParams {
  longRoC: number;
  shortRoC: number;
  wmaPeriod: number;
  discipline: DisciplineParams;
}

export const defaultCoppockCurveParams: CoppockCurveParams = {
  longRoC: 14,
  shortRoC: 11,
  wmaPeriod: 10,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const coppockCurveStrategy: Strategy = {
  id: 'coppock-curve',
  name: 'Coppock Curve',
  description: 'A long-term momentum indicator. Signals are generated when the curve moves from negative to positive.',
  async calculate(data: HistoricalData[], userParams: Partial<CoppockCurveParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultCoppockCurveParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const requiredData = params.longRoC + params.wmaPeriod;

    if (data.length < requiredData) return dataWithIndicators;

    const closePrices = data.map(d => d.close);
    const coppock = calculateCoppockCurve(closePrices, params.longRoC, params.shortRoC, params.wmaPeriod);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.coppock = coppock[i];
      if (i > 0 && coppock[i-1] !== null && coppock[i] !== null) {
        if (coppock[i-1]! <= 0 && coppock[i]! > 0) {
          d.bullish_event = true;
        }
        if (coppock[i-1]! >= 0 && coppock[i]! < 0) {
          d.bearish_event = true;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default coppockCurveStrategy;
