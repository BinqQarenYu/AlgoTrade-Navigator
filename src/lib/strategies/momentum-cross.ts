'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateMomentum } from '@/lib/indicators';

export interface MomentumCrossParams {
  period: number;
}

export const defaultMomentumCrossParams: MomentumCrossParams = {
  period: 14,
};

const momentumCrossStrategy: Strategy = {
  id: 'momentum-cross',
  name: 'Momentum Zero-Line Cross',
  description: 'A simple strategy that enters when momentum crosses the zero line, indicating a potential trend change.',
  async calculate(data: HistoricalData[], params: MomentumCrossParams = defaultMomentumCrossParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;

    const closePrices = data.map(d => d.close);
    const momentum = calculateMomentum(closePrices, params.period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.momentum = momentum[i];
      d.signal = null;
      if (i > 0 && momentum[i-1] !== null && momentum[i] !== null) {
        // Buy Signal: Momentum crosses above zero
        if (momentum[i-1]! <= 0 && momentum[i]! > 0) {
          d.signal = 'BUY';
        }
        // Sell Signal: Momentum crosses below zero
        if (momentum[i-1]! >= 0 && momentum[i]! < 0) {
          d.signal = 'SELL';
        }
      }
    });

    return dataWithIndicators;
  },
};

export default momentumCrossStrategy;
