'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateCMF } from '@/lib/indicators';

export interface ChaikinMoneyFlowParams {
  period: number;
  reverse?: boolean;
  discipline: DisciplineParams;
}

export const defaultChaikinMoneyFlowParams: ChaikinMoneyFlowParams = {
  period: 20,
  reverse: false,
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
  async calculate(data: HistoricalData[], params: ChaikinMoneyFlowParams = defaultChaikinMoneyFlowParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;

    const cmf = calculateCMF(data, params.period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.cmf = cmf[i];
      if (i > 0 && cmf[i-1] !== null && cmf[i] !== null) {
        // Buy Signal: CMF crosses above zero
        const standardBuy = cmf[i-1]! <= 0 && cmf[i]! > 0;
        // Sell Signal: CMF crosses below zero
        const standardSell = cmf[i-1]! >= 0 && cmf[i]! < 0;
        
        if (params.reverse) {
            if (standardBuy) d.sellSignal = d.high;
            if (standardSell) d.buySignal = d.low;
        } else {
            if (standardBuy) d.buySignal = d.low;
            if (standardSell) d.sellSignal = d.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default chaikinMoneyFlowStrategy;
