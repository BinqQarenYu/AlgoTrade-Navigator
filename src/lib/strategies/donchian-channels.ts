
'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateDonchianChannels } from '@/lib/indicators';

const donchianChannelStrategy: Strategy = {
  id: 'donchian-channels',
  name: 'Donchian Channel Breakout',
  description: 'A volatility breakout strategy that buys on a close above the recent highest high and sells on a close below the recent lowest low.',
  async calculate(data: HistoricalData[]): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const period = 20;

    if (data.length < period) return dataWithIndicators;

    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const { upper, middle, lower } = calculateDonchianChannels(highs, lows, period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.donchian_upper = upper[i];
      d.donchian_middle = middle[i];
      d.donchian_lower = lower[i];
      
      if (i > 0 && upper[i-1] && lower[i-1] && upper[i] && lower[i]) {
        // Buy signal: close breaks above the upper channel
        if (data[i-1].close <= upper[i-1]! && data[i].close > upper[i]!) {
            d.buySignal = d.low;
        }

        // Sell signal: close breaks below the lower channel
        if (data[i-1].close >= lower[i-1]! && data[i].close < lower[i]!) {
            d.sellSignal = d.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default donchianChannelStrategy;
