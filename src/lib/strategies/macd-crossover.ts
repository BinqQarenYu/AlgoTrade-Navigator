'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateMACD } from '@/lib/indicators';

export interface MacdCrossoverParams {
  shortPeriod: number;
  longPeriod: number;
  signalPeriod: number;
}

export const defaultMacdCrossoverParams: MacdCrossoverParams = {
  shortPeriod: 12,
  longPeriod: 26,
  signalPeriod: 9,
};

const macdCrossoverStrategy: Strategy = {
  id: 'macd-crossover',
  name: 'MACD Crossover',
  description: 'A momentum strategy based on the MACD line crossing over or under its signal line.',
  async calculate(data: HistoricalData[], params: MacdCrossoverParams = defaultMacdCrossoverParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.longPeriod) return dataWithIndicators;

    const closePrices = data.map(d => d.close);
    const { macd, signal, histogram } = calculateMACD(closePrices, params.shortPeriod, params.longPeriod, params.signalPeriod);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.macd = macd[i];
      d.macd_signal = signal[i];
      d.macd_hist = histogram[i];
      d.signal = null;

      if (i > 0 && macd[i-1] && signal[i-1] && macd[i] && signal[i]) {
        // Bullish Crossover
        if (macd[i-1]! <= signal[i-1]! && macd[i]! > signal[i]!) {
          d.signal = 'BUY';
        }
        // Bearish Crossover
        if (macd[i-1]! >= signal[i-1]! && macd[i]! < signal[i]!) {
          d.signal = 'SELL';
        }
      }
    });

    return dataWithIndicators;
  },
};

export default macdCrossoverStrategy;
