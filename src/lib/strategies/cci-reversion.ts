'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateCCI } from '@/lib/indicators';

export interface CciReversionParams {
  period: number;
  overbought: number;
  oversold: number;
}

export const defaultCciReversionParams: CciReversionParams = {
  period: 20,
  overbought: 100,
  oversold: -100,
};

const cciReversionStrategy: Strategy = {
  id: 'cci-reversion',
  name: 'CCI Reversion',
  description: 'A mean-reversion strategy using the Commodity Channel Index (CCI) to find overbought/oversold conditions.',
  async calculate(data: HistoricalData[], params: CciReversionParams = defaultCciReversionParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;

    const cci = calculateCCI(data, params.period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.cci = cci[i];
      d.signal = null;
      if (i > 0 && cci[i-1] !== null && cci[i] !== null) {
        // Buy signal: CCI crosses back above oversold level
        if (cci[i-1]! <= params.oversold && cci[i]! > params.oversold) {
          d.signal = 'BUY';
        }
        // Sell signal: CCI crosses back below overbought level
        if (cci[i-1]! >= params.overbought && cci[i]! < params.overbought) {
          d.signal = 'SELL';
        }
      }
    });

    return dataWithIndicators;
  },
};

export default cciReversionStrategy;
