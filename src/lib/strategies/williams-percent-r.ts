'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateWilliamsR } from '@/lib/indicators';

export interface WilliamsRParams {
  period: number;
  overbought: number;
  oversold: number;
  discipline: DisciplineParams;
}

export const defaultWilliamsRParams: WilliamsRParams = {
  period: 14,
  overbought: -20,
  oversold: -80,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const williamsRStrategy: Strategy = {
  id: 'williams-r',
  name: 'Williams %R',
  description: 'A momentum indicator that signals overbought and oversold conditions, similar to the Stochastic Oscillator.',
  async calculate(data: HistoricalData[], userParams: Partial<WilliamsRParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultWilliamsRParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;

    const williamsR = calculateWilliamsR(data, params.period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.williams_r = williamsR[i];
      if (i > 0 && williamsR[i-1] !== null && williamsR[i] !== null) {
        if (williamsR[i-1]! <= params.oversold && williamsR[i]! > params.oversold) {
          d.bullish_event = true;
        }
        if (williamsR[i-1]! >= params.overbought && williamsR[i]! < params.overbought) {
          d.bearish_event = true;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default williamsRStrategy;
