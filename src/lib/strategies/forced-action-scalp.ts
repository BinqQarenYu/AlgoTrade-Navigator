'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateSupertrend, calculateATR } from '@/lib/indicators';

export interface ForcedActionScalpParams {
  supertrendPeriod: number;
  supertrendMultiplier: number;
  atrPeriod: number;
  atrMultiplierSL: number;
  atrMultiplierTP: number;
  reverse?: boolean;
  discipline: DisciplineParams;
}

export const defaultForcedActionScalpParams: ForcedActionScalpParams = {
  supertrendPeriod: 10,
  supertrendMultiplier: 2,
  atrPeriod: 14,
  atrMultiplierSL: 1.5,
  atrMultiplierTP: 2.0,
  reverse: false,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 5,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const forcedActionScalpStrategy: Strategy = {
  id: 'forced-action-scalp',
  name: 'Forced-Action Scalp',
  description: 'A high-frequency strategy that makes a trade on every candle based on Supertrend direction, using dynamic ATR-based Take Profit and Stop Loss levels.',
  
  async calculate(data: HistoricalData[], userParams: Partial<ForcedActionScalpParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultForcedActionScalpParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const requiredDataLength = Math.max(params.supertrendPeriod, params.atrPeriod);

    if (data.length < requiredDataLength) return dataWithIndicators;

    const { direction: supertrendDirection } = calculateSupertrend(data, params.supertrendPeriod, params.supertrendMultiplier);
    const atrValues = calculateATR(data, params.atrPeriod);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.supertrend_direction = supertrendDirection[i];
      d.atr = atrValues[i];

      if (i < 1) return;

      const trendDirection = supertrendDirection[i];
      const atr = atrValues[i];

      if (trendDirection === null || atr === null) return;

      const isInUptrend = trendDirection === 1;
      const isInDowntrend = trendDirection === -1;
      
      const standardBuy = isInUptrend;
      const standardSell = isInDowntrend;

      d.signal = null;
      if (params.reverse) {
        if (standardBuy) {
            d.signal = 'SELL';
        }
        if (standardSell) {
            d.signal = 'BUY';
        }
      } else {
        if (standardBuy) {
            d.signal = 'BUY';
        }
        if (standardSell) {
            d.signal = 'SELL';
        }
      }
    });

    return dataWithIndicators;
  },
};

export default forcedActionScalpStrategy;
