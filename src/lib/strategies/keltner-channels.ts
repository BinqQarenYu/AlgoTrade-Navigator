'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateKeltnerChannels } from '@/lib/indicators';

export interface KeltnerChannelsParams {
  period: number;
  multiplier: number;
  discipline: DisciplineParams;
}

export const defaultKeltnerChannelsParams: KeltnerChannelsParams = {
  period: 20,
  multiplier: 2,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const keltnerChannelsStrategy: Strategy = {
  id: 'keltner-channels',
  name: 'Keltner Channels Breakout',
  description: 'A volatility-based strategy using Keltner Channels to trade breakouts.',
  async calculate(data: HistoricalData[], userParams: Partial<KeltnerChannelsParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultKeltnerChannelsParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;
    
    const { upper, middle, lower } = calculateKeltnerChannels(data, params.period, params.multiplier);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.keltner_upper = upper[i];
      d.keltner_middle = middle[i];
      d.keltner_lower = lower[i];
      
      if (i > 0 && upper[i-1] && upper[i] && data[i-1].close <= upper[i-1]! && data[i].close > upper[i]!) {
        d.bullish_event = true;
      }
      if (i > 0 && lower[i-1] && lower[i] && data[i-1].close >= lower[i-1]! && data[i].close < lower[i]!) {
        d.bearish_event = true;
      }
    });

    return dataWithIndicators;
  },
};

export default keltnerChannelsStrategy;
