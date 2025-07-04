'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateMACD } from '@/lib/indicators';

const macdCrossoverStrategy: Strategy = {
  id: 'macd-crossover',
  name: 'MACD Crossover',
  description: 'A momentum strategy based on the MACD line crossing over or under its signal line.',
  async calculate(data: HistoricalData[]): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const shortPeriod = 12;
    const longPeriod = 26;
    const signalPeriod = 9;

    if (data.length < longPeriod) return dataWithIndicators;

    const closePrices = data.map(d => d.close);
    const { macd, signal, histogram } = calculateMACD(closePrices, shortPeriod, longPeriod, signalPeriod);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.macd = macd[i];
      d.macd_signal = signal[i];
      d.macd_hist = histogram[i];

      if (i > 0 && macd[i-1] && signal[i-1] && macd[i] && signal[i]) {
        // Bullish Crossover
        if (macd[i-1]! <= signal[i-1]! && macd[i]! > signal[i]!) {
          d.buySignal = d.low;
        }
        // Bearish Crossover
        if (macd[i-1]! >= signal[i-1]! && macd[i]! < signal[i]!) {
          d.sellSignal = d.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default macdCrossoverStrategy;
