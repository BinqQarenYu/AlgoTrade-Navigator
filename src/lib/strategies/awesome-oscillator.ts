'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '../types';
import { calculateAwesomeOscillator } from '../indicators';

export interface AwesomeOscillatorParams {
  shortPeriod: number;
  longPeriod: number;
  reverse?: boolean;
  discipline: DisciplineParams;
}

export const defaultAwesomeOscillatorParams: AwesomeOscillatorParams = {
  shortPeriod: 5,
  longPeriod: 34,
  reverse: false,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const awesomeOscillatorStrategy: Strategy = {
  id: 'awesome-oscillator',
  name: 'Awesome Oscillator Cross',
  description: 'Uses the Awesome Oscillator to identify bullish or bearish momentum by crossing the zero line.',
  async calculate(data: HistoricalData[], params: AwesomeOscillatorParams = defaultAwesomeOscillatorParams): Promise<HistoricalData[]> {
    if (!data || data.length === 0) return [];

    if (data.length < params.longPeriod) return data.map(d => ({ ...d }));

    const ao = calculateAwesomeOscillator(data, params.shortPeriod, params.longPeriod);

    return data.map((d, i) => {
      const result: HistoricalData = { ...d, awesome_oscillator: ao[i] };

      if (i > 0 && ao[i-1] !== null && ao[i] !== null) {
        // Bullish Crossover (from below zero to above zero)
        const standardBuy = ao[i-1]! <= 0 && ao[i]! > 0;
        // Bearish Crossover (from above zero to below zero)
        const standardSell = ao[i-1]! >= 0 && ao[i]! < 0;

        if (params.reverse) {
            if (standardBuy) result.sellSignal = result.high;
            if (standardSell) result.buySignal = result.low;
        } else {
            if (standardBuy) result.buySignal = result.low;
            if (standardSell) result.sellSignal = result.high;
        }
      }
      return result;
    });
  },
};

export default awesomeOscillatorStrategy;
