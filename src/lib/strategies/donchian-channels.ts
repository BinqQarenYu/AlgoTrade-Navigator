'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateDonchianChannels } from '@/lib/indicators';

export interface DonchianChannelsParams {
  period: number;
  reverse?: boolean;
  discipline: DisciplineParams;
}

export const defaultDonchianChannelsParams: DonchianChannelsParams = {
  period: 20,
  reverse: false,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 2,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const donchianChannelStrategy: Strategy = {
  id: 'donchian-channels',
  name: 'Donchian Channel Breakout',
  description: 'A volatility breakout strategy that buys on a close above the recent highest high and sells on a close below the recent lowest low.',
  async calculate(data: HistoricalData[], params: DonchianChannelsParams = defaultDonchianChannelsParams): Promise<HistoricalData[]> {
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
        // Buy signal: close breaks above the upper channel
        const standardBuy = data[i-1].close <= upper[i-1]! && data[i].close > upper[i]!;

        // Sell signal: close breaks below the lower channel
        const standardSell = data[i-1].close >= lower[i-1]! && data[i].close < lower[i]!;

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

export default donchianChannelStrategy;
