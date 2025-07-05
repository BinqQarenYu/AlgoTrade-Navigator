
'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateAwesomeOscillator } from '@/lib/indicators';

const awesomeOscillatorStrategy: Strategy = {
  id: 'awesome-oscillator',
  name: 'Awesome Oscillator Cross',
  description: 'Uses the Awesome Oscillator to identify bullish or bearish momentum by crossing the zero line.',
  async calculate(data: HistoricalData[]): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const shortPeriod = 5;
    const longPeriod = 34;

    if (data.length < longPeriod) return dataWithIndicators;

    const ao = calculateAwesomeOscillator(data, shortPeriod, longPeriod);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.awesome_oscillator = ao[i];
      if (i > 0 && ao[i-1] !== null && ao[i] !== null) {
        // Bullish Crossover (from below zero to above zero)
        if (ao[i-1]! <= 0 && ao[i]! > 0) {
          d.buySignal = d.low;
        }
        // Bearish Crossover (from above zero to below zero)
        if (ao[i-1]! >= 0 && ao[i]! < 0) {
          d.sellSignal = d.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default awesomeOscillatorStrategy;
