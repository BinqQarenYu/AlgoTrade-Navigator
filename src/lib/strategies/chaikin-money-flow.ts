'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateCMF } from '@/lib/indicators';

export interface ChaikinMoneyFlowParams {
  period: number;
  discipline: DisciplineParams;
}

export const defaultChaikinMoneyFlowParams: ChaikinMoneyFlowParams = {
  period: 20,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const chaikinMoneyFlowStrategy: Strategy = {
  id: 'chaikin-money-flow',
  name: 'Chaikin Money Flow',
  description: 'Measures buying and selling pressure. Signals are generated when the CMF crosses the zero line.',
  async calculate(data: HistoricalData[], userParams: Partial<ChaikinMoneyFlowParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultChaikinMoneyFlowParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;

    const cmf = calculateCMF(data, params.period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.cmf = cmf[i];
      if (i > 0 && cmf[i-1] !== null && cmf[i] !== null) {
        if (cmf[i-1]! <= 0 && cmf[i]! > 0) {
          d.bullish_event = true;
        }
        if (cmf[i-1]! >= 0 && cmf[i]! < 0) {
          d.bearish_event = true;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default chaikinMoneyFlowStrategy;
