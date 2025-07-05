'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateVWAP } from '@/lib/indicators';

export interface VwapCrossParams {
  period: number;
}

export const defaultVwapCrossParams: VwapCrossParams = {
  period: 20,
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
        if (data[i-1].close <= vwap[i-1]! && data[i].close > vwap[i]!) {
          d.buySignal = d.low;
        }
        // Sell signal: close crosses below VWAP
        if (data[i-1].close >= vwap[i-1]! && data[i].close < vwap[i]!) {
          d.sellSignal = d.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default vwapCrossStrategy;
