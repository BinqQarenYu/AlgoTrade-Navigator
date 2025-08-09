'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateOBV, calculateSMA } from '@/lib/indicators';

export interface ObvDivergenceParams {
  period: number;
}

export const defaultObvDivergenceParams: ObvDivergenceParams = {
  period: 20,
};

const obvDivergenceStrategy: Strategy = {
  id: 'obv-divergence',
  name: 'OBV Divergence',
  description: 'Identifies potential reversals by comparing On-Balance Volume (OBV) trend with price trend.',
  async calculate(data: HistoricalData[], params: ObvDivergenceParams = defaultObvDivergenceParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;

    const obv = calculateOBV(data);
    const obvSma = calculateSMA(obv.filter(v => v !== null) as number[], params.period);
    const obvSmaPadded = [...Array(data.length - obvSma.length).fill(null), ...obvSma];

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.obv = obv[i];
      d.signal = null;
      if (i > 0 && obv[i-1] !== null && obv[i] !== null && obvSmaPadded[i-1] !== null && obvSmaPadded[i] !== null) {
        const obvCrossesUp = obv[i]! > obvSmaPadded[i]! && obv[i-1]! <= obvSmaPadded[i-1]!;
        const obvCrossesDown = obv[i]! < obvSmaPadded[i]! && obv[i-1]! >= obvSmaPadded[i-1]!;
        
        // Buy signal: OBV crosses above its moving average, suggesting buying pressure is taking over
        if (obvCrossesUp) {
            d.signal = 'BUY';
        }

        // Sell signal: OBV crosses below its moving average, suggesting selling pressure is taking over
        if (obvCrossesDown) {
            d.signal = 'SELL';
        }
      }
    });

    return dataWithIndicators;
  },
};

export default obvDivergenceStrategy;
