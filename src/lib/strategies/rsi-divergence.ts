'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateRSI } from '@/lib/indicators';

export interface RsiDivergenceParams {
  period: number;
  oversold: number;
  overbought: number;
  reverse?: boolean;
  discipline: DisciplineParams;
}

export const defaultRsiDivergenceParams: RsiDivergenceParams = {
  period: 14,
  oversold: 30,
  overbought: 70,
  reverse: false,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const rsiDivergenceStrategy: Strategy = {
  id: 'rsi-divergence',
  name: 'RSI Divergence',
  description: 'A mean-reversion strategy that identifies overbought and oversold conditions using the RSI indicator.',
  async calculate(data: HistoricalData[], params: RsiDivergenceParams = defaultRsiDivergenceParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    if (data.length < params.period + 1) return dataWithIndicators;
    
    const closePrices = data.map(d => d.close);
    const rsi = calculateRSI(closePrices, params.period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.rsi = rsi[i];
       if (i > 0 && rsi[i-1] != null && rsi[i] != null) {
        const standardBuy = rsi[i-1]! <= params.oversold && rsi[i]! > params.oversold;
        const standardSell = rsi[i-1]! >= params.overbought && rsi[i]! < params.overbought;

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

export default rsiDivergenceStrategy;
