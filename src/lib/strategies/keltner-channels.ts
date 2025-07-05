
'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateKeltnerChannels } from '@/lib/indicators';

const keltnerChannelsStrategy: Strategy = {
  id: 'keltner-channels',
  name: 'Keltner Channels Breakout',
  description: 'A volatility-based strategy using Keltner Channels to trade breakouts.',
  async calculate(data: HistoricalData[]): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const period = 20;
    const multiplier = 2;

    if (data.length < period) return dataWithIndicators;
    
    const { upper, middle, lower } = calculateKeltnerChannels(data, period, multiplier);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.keltner_upper = upper[i];
      d.keltner_middle = middle[i];
      d.keltner_lower = lower[i];
      
      if (i > 0 && upper[i-1] && upper[i]) {
        // Buy signal: close breaks above the upper channel
        if (data[i-1].close <= upper[i-1]! && data[i].close > upper[i]!) {
            d.buySignal = d.low;
        }
      }
      if (i > 0 && lower[i-1] && lower[i]) {
        // Sell signal: close breaks below the lower channel
        if (data[i-1].close >= lower[i-1]! && data[i].close < lower[i]!) {
            d.sellSignal = d.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default keltnerChannelsStrategy;
