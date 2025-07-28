'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateDonchianChannels } from '@/lib/indicators';

export interface DonchianChannelsParams {
  period: number;
  discipline: DisciplineParams;
}

export const defaultDonchianChannelsParams: DonchianChannelsParams = {
  period: 20,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const donchianChannelStrategy: Strategy = {
  id: 'donchian-channels',
  name: 'Donchian Channel Breakout',
  description: 'A volatility breakout strategy that buys on a close above the recent highest high and sells on a close below the recent lowest low.',
  async calculate(data: HistoricalData[], userParams: Partial<DonchianChannelsParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultDonchianChannelsParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;

    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const { upper, middle, lower } = calculateDonchianChannels(highs, lows, params.period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.donchian_upper = upper[i];
      d.donchian_middle = middle[i];
      d.donchian_lower = lower[i];
      
      if (i > 0 && upper[i-1] && lower[i-1] && upper[i] && lower[i]) {
        if (data[i-1].close <= upper[i-1]! && data[i].close > upper[i]!) {
            d.bullish_event = true;
        }
        if (data[i-1].close >= lower[i-1]! && data[i].close < lower[i]!) {
            d.bearish_event = true;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default donchianChannelStrategy;
