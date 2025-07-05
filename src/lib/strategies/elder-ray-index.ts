'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateElderRay, calculateEMA } from '@/lib/indicators';

export interface ElderRayIndexParams {
  period: number;
}

export const defaultElderRayIndexParams: ElderRayIndexParams = {
  period: 13,
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
        if (trendUp && bearPower[i-1]! <= 0 && bearPower[i]! > 0) {
          d.buySignal = d.low;
        }

        // Sell Signal: EMA is falling and Bull Power crosses below zero
        if (trendDown && bullPower[i-1]! >= 0 && bullPower[i]! < 0) {
          d.sellSignal = d.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default elderRayStrategy;
