'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateStochastic } from '@/lib/indicators';

export interface StochasticCrossoverParams {
  period: number;
  smoothK: number;
  smoothD: number;
}

export const defaultStochasticCrossoverParams: StochasticCrossoverParams = {
  period: 14,
  smoothK: 3,
  smoothD: 3,
};

const stochasticCrossoverStrategy: Strategy = {
  id: 'stochastic-crossover',
  name: 'Stochastic Crossover',
  description: 'A momentum strategy based on the Stochastic Oscillator %K line crossing over or under the %D line.',
  async calculate(data: HistoricalData[], params: StochasticCrossoverParams = defaultStochasticCrossoverParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    
    if (data.length < params.period + params.smoothK + params.smoothD) return dataWithIndicators;

    const { k, d: stochD } = calculateStochastic(data, params.period, params.smoothK, params.smoothD);

    dataWithIndicators.forEach((dItem: HistoricalData, i: number) => {
      dItem.stoch_k = k[i];
      dItem.stoch_d = stochD[i];

      if (i > 0 && k[i-1] !== null && stochD[i-1] !== null && k[i] !== null && stochD[i] !== null) {
        // Bullish Crossover
        if (k[i-1]! <= stochD[i-1]! && k[i]! > stochD[i]!) {
          dItem.buySignal = dItem.low;
        }
        // Bearish Crossover
        if (k[i-1]! >= stochD[i-1]! && k[i]! < stochD[i]!) {
          dItem.sellSignal = dItem.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default stochasticCrossoverStrategy;
