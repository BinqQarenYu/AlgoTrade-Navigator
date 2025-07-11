'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateKeltnerChannels } from '@/lib/indicators';

export interface KeltnerChannelsParams {
  period: number;
  multiplier: number;
  reverse?: boolean;
}

export const defaultKeltnerChannelsParams: KeltnerChannelsParams = {
  period: 20,
  multiplier: 2,
  reverse: false,
};

const keltnerChannelsStrategy: Strategy = {
  id: 'keltner-channels',
  name: 'Keltner Channels Breakout',
  description: 'A volatility-based strategy using Keltner Channels to trade breakouts.',
  async calculate(data: HistoricalData[], params: KeltnerChannelsParams = defaultKeltnerChannelsParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;
    
    const { upper, middle, lower } = calculateKeltnerChannels(data, params.period, params.multiplier);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.keltner_upper = upper[i];
      d.keltner_middle = middle[i];
      d.keltner_lower = lower[i];
      
      const standardBuy = i > 0 && upper[i-1] && upper[i] && data[i-1].close <= upper[i-1]! && data[i].close > upper[i]!;
      const standardSell = i > 0 && lower[i-1] && lower[i] && data[i-1].close >= lower[i-1]! && data[i].close < lower[i]!;

      if (params.reverse) {
          if (standardBuy) d.sellSignal = d.high;
          if (standardSell) d.buySignal = d.low;
      } else {
          if (standardBuy) d.buySignal = d.low;
          if (standardSell) d.sellSignal = d.high;
      }
    });

    return dataWithIndicators;
  },
};

export default keltnerChannelsStrategy;
