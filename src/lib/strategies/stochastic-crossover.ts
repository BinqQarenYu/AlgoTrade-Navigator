'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateStochastic } from '@/lib/indicators';

export interface StochasticCrossoverParams {
  period: number;
  smoothK: number;
  smoothD: number;
  discipline: DisciplineParams;
}

export const defaultStochasticCrossoverParams: StochasticCrossoverParams = {
  period: 14,
  smoothK: 3,
  smoothD: 3,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const stochasticCrossoverStrategy: Strategy = {
  id: 'stochastic-crossover',
  name: 'Stochastic Crossover',
  description: 'A momentum strategy based on the Stochastic Oscillator %K line crossing over or under the %D line.',
  async calculate(data: HistoricalData[], userParams: Partial<StochasticCrossoverParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultStochasticCrossoverParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    
    if (data.length < params.period + params.smoothK + params.smoothD) return dataWithIndicators;

    const { k, d: stochD } = calculateStochastic(data, params.period, params.smoothK, params.smoothD);

    dataWithIndicators.forEach((dItem: HistoricalData, i: number) => {
      dItem.stoch_k = k[i];
      dItem.stoch_d = stochD[i];

      if (i > 0 && k[i-1] !== null && stochD[i-1] !== null && k[i] !== null && stochD[i] !== null) {
        if (k[i-1]! <= stochD[i-1]! && k[i]! > stochD[i]!) {
          dItem.bullish_event = true;
        }
        if (k[i-1]! >= stochD[i-1]! && k[i]! < stochD[i]!) {
          dItem.bearish_event = true;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default stochasticCrossoverStrategy;
