'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateMomentum } from '@/lib/indicators';

export interface MomentumCrossParams {
  period: number;
  reverse?: boolean;
}

export const defaultMomentumCrossParams: MomentumCrossParams = {
  period: 14,
  reverse: false,
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
      if (i > 0 && momentum[i-1] !== null && momentum[i] !== null) {
        // Buy Signal: Momentum crosses above zero
        const standardBuy = momentum[i-1]! <= 0 && momentum[i]! > 0;
        // Sell Signal: Momentum crosses below zero
        const standardSell = momentum[i-1]! >= 0 && momentum[i]! < 0;

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

export default momentumCrossStrategy;
