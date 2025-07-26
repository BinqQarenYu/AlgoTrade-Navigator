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
  
  async calculate(data: HistoricalData[], params: ForcedActionScalpParams = defaultForcedActionScalpParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const requiredDataLength = Math.max(params.supertrendPeriod, params.atrPeriod);

    if (data.length < requiredDataLength) return dataWithIndicators;

    const { supertrend, direction: supertrendDirection } = calculateSupertrend(data, params.supertrendPeriod, params.supertrendMultiplier);
    const atrValues = calculateATR(data, params.atrPeriod);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.supertrend = supertrend[i];
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

      if (params.reverse) {
        if (standardBuy) {
            d.sellSignal = d.close;
            d.stopLossLevel = d.close + (atr * params.atrMultiplierSL);
            d.takeProfitLevel = d.close - (atr * params.atrMultiplierTP);
        }
        if (standardSell) {
            d.buySignal = d.close;
            d.stopLossLevel = d.close - (atr * params.atrMultiplierSL);
            d.takeProfitLevel = d.close + (atr * params.atrMultiplierTP);
        }
      } else {
        if (standardBuy) {
            d.buySignal = d.close;
            d.stopLossLevel = d.close - (atr * params.atrMultiplierSL);
            d.takeProfitLevel = d.close + (atr * params.atrMultiplierTP);
        }
        if (standardSell) {
            d.sellSignal = d.close;
            d.stopLossLevel = d.close + (atr * params.atrMultiplierSL);
            d.takeProfitLevel = d.close - (atr * params.atrMultiplierTP);
        }
      }
    });

    return dataWithIndicators;
  },
};

export default forcedActionScalpStrategy;
