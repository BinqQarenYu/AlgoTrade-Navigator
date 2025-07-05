
'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateWilliamsR } from '@/lib/indicators';

const williamsRStrategy: Strategy = {
  id: 'williams-r',
  name: 'Williams %R',
  description: 'A momentum indicator that signals overbought and oversold conditions, similar to the Stochastic Oscillator.',
  async calculate(data: HistoricalData[]): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const period = 14;
    const overbought = -20;
    const oversold = -80;

    if (data.length < period) return dataWithIndicators;

    const williamsR = calculateWilliamsR(data, period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.williams_r = williamsR[i];
      if (i > 0 && williamsR[i-1] !== null && williamsR[i] !== null) {
        // Buy signal: %R crosses back above oversold level
        if (williamsR[i-1]! <= oversold && williamsR[i]! > oversold) {
          d.buySignal = d.low;
        }
        // Sell signal: %R crosses back below overbought level
        if (williamsR[i-1]! >= overbought && williamsR[i]! < overbought) {
          d.sellSignal = d.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default williamsRStrategy;
