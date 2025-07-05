
'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateCMF } from '@/lib/indicators';

const chaikinMoneyFlowStrategy: Strategy = {
  id: 'chaikin-money-flow',
  name: 'Chaikin Money Flow',
  description: 'Measures buying and selling pressure. Signals are generated when the CMF crosses the zero line.',
  async calculate(data: HistoricalData[]): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const period = 20;

    if (data.length < period) return dataWithIndicators;

    const cmf = calculateCMF(data, period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.cmf = cmf[i];
      if (i > 0 && cmf[i-1] !== null && cmf[i] !== null) {
        // Buy Signal: CMF crosses above zero
        if (cmf[i-1]! <= 0 && cmf[i]! > 0) {
          d.buySignal = d.low;
        }
        // Sell Signal: CMF crosses below zero
        if (cmf[i-1]! >= 0 && cmf[i]! < 0) {
          d.sellSignal = d.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default chaikinMoneyFlowStrategy;
