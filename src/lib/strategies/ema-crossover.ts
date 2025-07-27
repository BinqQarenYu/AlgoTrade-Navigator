'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateEMA } from '@/lib/indicators';

export interface EmaCrossoverParams {
  shortPeriod: number;
  longPeriod: number;
  reverse?: boolean;
  discipline: DisciplineParams;
}

export const defaultEmaCrossoverParams: EmaCrossoverParams = {
  shortPeriod: 12,
  longPeriod: 26,
  reverse: false,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const emaCrossoverStrategy: Strategy = {
  id: 'ema-crossover',
  name: 'EMA Crossover',
  description: 'A trend-following strategy using Exponential Moving Averages, which give more weight to recent prices.',
  async calculate(data: HistoricalData[], userParams: Partial<EmaCrossoverParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultEmaCrossoverParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    if (data.length < params.longPeriod) return dataWithIndicators;

    const closePrices = data.map(d => d.close);
    const ema_short = calculateEMA(closePrices, params.shortPeriod);
    const ema_long = calculateEMA(closePrices, params.longPeriod);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.ema_short = ema_short[i];
      d.ema_long = ema_long[i];
      if (i > 0 && ema_short[i-1] && ema_long[i-1] && ema_short[i] && ema_long[i]) {
        const standardBuy = ema_short[i-1] <= ema_long[i-1] && ema_short[i] > ema_long[i];
        const standardSell = ema_short[i-1] >= ema_long[i-1] && ema_short[i] < ema_long[i];

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

export default emaCrossoverStrategy;
