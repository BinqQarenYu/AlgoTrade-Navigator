'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateVWAP } from '@/lib/indicators';

export interface VwapCrossParams {
  period: number;
  discipline: DisciplineParams;
}

export const defaultVwapCrossParams: VwapCrossParams = {
  period: 20,
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
  async calculate(data: HistoricalData[], userParams: Partial<VwapCrossParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultVwapCrossParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;

    const vwap = calculateVWAP(data, params.period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.vwap = vwap[i];
      if (i > 0 && vwap[i-1] !== null && vwap[i] !== null) {
        if (data[i-1].close <= vwap[i-1]! && data[i].close > vwap[i]!) {
          d.bullish_event = true;
        }
        if (data[i-1].close >= vwap[i-1]! && data[i].close < vwap[i]!) {
          d.bearish_event = true;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default vwapCrossStrategy;
