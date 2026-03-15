'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '../types';
import { calculateCMF } from '../indicators';

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
    if (!data || data.length === 0) return [];

    if (data.length < params.period) return data.map(d => ({ ...d }));

    const cmf = calculateCMF(data, params.period);

    return data.map((d, i) => {
      const result: HistoricalData = { ...d, cmf: cmf[i] };

      if (i > 0 && cmf[i-1] !== null && cmf[i] !== null) {
        // Buy Signal: CMF crosses above zero
        const standardBuy = cmf[i-1]! <= 0 && cmf[i]! > 0;
        // Sell Signal: CMF crosses below zero
        const standardSell = cmf[i-1]! >= 0 && cmf[i]! < 0;
        
        if (params.reverse) {
            if (standardBuy) result.sellSignal = result.high;
            if (standardSell) result.buySignal = result.low;
        } else {
            if (standardBuy) result.buySignal = result.low;
            if (standardSell) result.sellSignal = result.high;
        }
      }
      return result;
    });
  },
};

export default chaikinMoneyFlowStrategy;
