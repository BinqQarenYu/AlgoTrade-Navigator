'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateRSI } from '@/lib/indicators';

export interface RsiDivergenceParams {
  period: number;
  oversold: number;
  overbought: number;
  discipline: DisciplineParams;
}

export const defaultRsiDivergenceParams: RsiDivergenceParams = {
  period: 14,
  oversold: 30,
  overbought: 70,
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
  async calculate(data: HistoricalData[], userParams: Partial<RsiDivergenceParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultRsiDivergenceParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    if (data.length < params.period + 1) return dataWithIndicators;
    
    const closePrices = data.map(d => d.close);
    const rsi = calculateRSI(closePrices, params.period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.rsi = rsi[i];
       if (i > 0 && rsi[i-1] && rsi[i]) {
        if (rsi[i-1] <= params.oversold && rsi[i] > params.oversold) {
          d.bullish_event = true;
        }
        if (rsi[i-1] >= params.overbought && rsi[i] < params.overbought) {
          d.bearish_event = true;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default rsiDivergenceStrategy;
