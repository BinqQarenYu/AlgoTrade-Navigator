'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateVWAP } from '@/lib/indicators';

export interface VwapCrossParams {
  period: number;
  reverse?: boolean;
  discipline: DisciplineParams;
}

export const defaultVwapCrossParams: VwapCrossParams = {
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

const vwapCrossStrategy: Strategy = {
  id: 'vwap-cross',
  name: 'VWAP Cross',
  description: 'Uses a moving Volume-Weighted Average Price (VWAP) to generate signals when the price crosses it.',
  async calculate(data: HistoricalData[], params: VwapCrossParams = defaultVwapCrossParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;

    const vwap = calculateVWAP(data, params.period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.vwap = vwap[i];
      if (i > 0 && vwap[i-1] !== null && vwap[i] !== null) {
        // Buy signal: close crosses above VWAP
        const standardBuy = data[i-1].close <= vwap[i-1]! && data[i].close > vwap[i]!;
        // Sell signal: close crosses below VWAP
        const standardSell = data[i-1].close >= vwap[i-1]! && data[i].close < vwap[i]!;

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

export default vwapCrossStrategy;
