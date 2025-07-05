'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateWilliamsR } from '@/lib/indicators';

export interface WilliamsRParams {
  period: number;
  overbought: number;
  oversold: number;
}

export const defaultWilliamsRParams: WilliamsRParams = {
  period: 14,
  overbought: -20,
  oversold: -80,
};

const williamsRStrategy: Strategy = {
  id: 'williams-r',
  name: 'Williams %R',
  description: 'A momentum indicator that signals overbought and oversold conditions, similar to the Stochastic Oscillator.',
  async calculate(data: HistoricalData[], params: WilliamsRParams = defaultWilliamsRParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;

    const williamsR = calculateWilliamsR(data, params.period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.williams_r = williamsR[i];
      if (i > 0 && williamsR[i-1] !== null && williamsR[i] !== null) {
        // Buy signal: %R crosses back above oversold level
        if (williamsR[i-1]! <= params.oversold && williamsR[i]! > params.oversold) {
          d.buySignal = d.low;
        }
        // Sell signal: %R crosses back below overbought level
        if (williamsR[i-1]! >= params.overbought && williamsR[i]! < params.overbought) {
          d.sellSignal = d.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default williamsRStrategy;
