
'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateCCI } from '@/lib/indicators';

const cciReversionStrategy: Strategy = {
  id: 'cci-reversion',
  name: 'CCI Reversion',
  description: 'A mean-reversion strategy using the Commodity Channel Index (CCI) to find overbought/oversold conditions.',
  async calculate(data: HistoricalData[]): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const period = 20;
    const overbought = 100;
    const oversold = -100;

    if (data.length < period) return dataWithIndicators;

    const cci = calculateCCI(data, period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.cci = cci[i];
      if (i > 0 && cci[i-1] !== null && cci[i] !== null) {
        // Buy signal: CCI crosses back above oversold level
        if (cci[i-1]! <= oversold && cci[i]! > oversold) {
          d.buySignal = d.low;
        }
        // Sell signal: CCI crosses back below overbought level
        if (cci[i-1]! >= overbought && cci[i]! < overbought) {
          d.sellSignal = d.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default cciReversionStrategy;
