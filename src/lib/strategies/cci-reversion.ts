'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateCCI } from '@/lib/indicators';

export interface CciReversionParams {
  period: number;
  overbought: number;
  oversold: number;
  reverse?: boolean;
}

export const defaultCciReversionParams: CciReversionParams = {
  period: 20,
  overbought: 100,
  oversold: -100,
  reverse: false,
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
      if (i > 0 && cci[i-1] !== null && cci[i] !== null) {
        // Buy signal: CCI crosses back above oversold level
        const standardBuy = cci[i-1]! <= params.oversold && cci[i]! > params.oversold;
        // Sell signal: CCI crosses back below overbought level
        const standardSell = cci[i-1]! >= params.overbought && cci[i]! < params.overbought;

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

export default cciReversionStrategy;
