
'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateMomentum } from '@/lib/indicators';

const momentumCrossStrategy: Strategy = {
  id: 'momentum-cross',
  name: 'Momentum Zero-Line Cross',
  description: 'A simple strategy that enters when momentum crosses the zero line, indicating a potential trend change.',
  async calculate(data: HistoricalData[]): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const period = 14;

    if (data.length < period) return dataWithIndicators;

    const closePrices = data.map(d => d.close);
    const momentum = calculateMomentum(closePrices, period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.momentum = momentum[i];
      if (i > 0 && momentum[i-1] !== null && momentum[i] !== null) {
        // Buy Signal: Momentum crosses above zero
        if (momentum[i-1]! <= 0 && momentum[i]! > 0) {
          d.buySignal = d.low;
        }
        // Sell Signal: Momentum crosses below zero
        if (momentum[i-1]! >= 0 && momentum[i]! < 0) {
          d.sellSignal = d.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default momentumCrossStrategy;
