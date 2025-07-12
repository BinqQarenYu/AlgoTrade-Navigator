'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateElderRay, calculateEMA } from '@/lib/indicators';

export interface ElderRayIndexParams {
  period: number;
  reverse?: boolean;
  discipline: DisciplineParams;
}

export const defaultElderRayIndexParams: ElderRayIndexParams = {
  period: 13,
  reverse: false,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 2,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const elderRayStrategy: Strategy = {
  id: 'elder-ray-index',
  name: 'Elder-Ray Index',
  description: 'Uses Bull and Bear Power oscillators to gauge market sentiment, with an EMA for trend direction.',
  async calculate(data: HistoricalData[], params: ElderRayIndexParams = defaultElderRayIndexParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;

    const closePrices = data.map(d => d.close);
    const ema = calculateEMA(closePrices, params.period);
    const { bullPower, bearPower } = calculateElderRay(data, params.period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.ema_short = ema[i];
      d.bull_power = bullPower[i];
      d.bear_power = bearPower[i];

      if (i > 0 && ema[i-1] && ema[i] && bullPower[i-1] && bearPower[i-1] && bullPower[i] && bearPower[i]) {
        const trendUp = ema[i]! > ema[i-1]!;
        const trendDown = ema[i]! < ema[i-1]!;

        // Buy Signal: EMA is rising and Bear Power crosses above zero
        const standardBuy = trendUp && bearPower[i-1]! <= 0 && bearPower[i]! > 0;

        // Sell Signal: EMA is falling and Bull Power crosses below zero
        const standardSell = trendDown && bullPower[i-1]! >= 0 && bullPower[i]! < 0;
        
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

export default elderRayStrategy;
