'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateAwesomeOscillator } from '@/lib/indicators';

export interface AwesomeOscillatorParams {
  shortPeriod: number;
  longPeriod: number;
  discipline: DisciplineParams;
}

export const defaultAwesomeOscillatorParams: AwesomeOscillatorParams = {
  shortPeriod: 5,
  longPeriod: 34,
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
  async calculate(data: HistoricalData[], userParams: Partial<AwesomeOscillatorParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultAwesomeOscillatorParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.longPeriod) return dataWithIndicators;

    const ao = calculateAwesomeOscillator(data, params.shortPeriod, params.longPeriod);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.awesome_oscillator = ao[i];
      if (i > 0 && ao[i-1] !== null && ao[i] !== null) {
        if (ao[i-1]! <= 0 && ao[i]! > 0) {
          d.bullish_event = true;
        }
        if (ao[i-1]! >= 0 && ao[i]! < 0) {
          d.bearish_event = true;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default awesomeOscillatorStrategy;
