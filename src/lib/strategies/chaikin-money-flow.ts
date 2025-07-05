'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateCMF } from '@/lib/indicators';

export interface ChaikinMoneyFlowParams {
  period: number;
}

export const defaultChaikinMoneyFlowParams: ChaikinMoneyFlowParams = {
  period: 20,
};

const chaikinMoneyFlowStrategy: Strategy = {
  id: 'chaikin-money-flow',
  name: 'Chaikin Money Flow',
  description: 'Measures buying and selling pressure. Signals are generated when the CMF crosses the zero line.',
  async calculate(data: HistoricalData[], params: ChaikinMoneyFlowParams = defaultChaikinMoneyFlowParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;

    const cmf = calculateCMF(data, params.period);

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
