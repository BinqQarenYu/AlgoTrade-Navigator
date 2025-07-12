'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateBollingerBands } from '@/lib/indicators';

export interface BollingerBandsParams {
  period: number;
  stdDev: number;
  reverse?: boolean;
  discipline: DisciplineParams;
}

export const defaultBollingerBandsParams: BollingerBandsParams = {
  period: 20,
  stdDev: 2,
  reverse: false,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 2,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const bollingerBandsStrategy: Strategy = {
  id: 'bollinger-bands',
  name: 'Bollinger Bands Reversion',
  description: 'A mean-reversion strategy that enters trades when price touches an outer band and then reverts towards the middle band.',
  async calculate(data: HistoricalData[], params: BollingerBandsParams = defaultBollingerBandsParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;

    const closePrices = data.map(d => d.close);
    const { upper, middle, lower } = calculateBollingerBands(closePrices, params.period, params.stdDev);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.bb_upper = upper[i];
      d.bb_middle = middle[i];
      d.bb_lower = lower[i];
      
      if (i > 0 && upper[i-1] && lower[i-1] && upper[i] && lower[i]) {
        const prevBar = data[i-1];
        const currentBar = d;

        const standardBuy = prevBar.low <= lower[i-1]! && currentBar.close > lower[i]!;
        const standardSell = prevBar.high >= upper[i-1]! && currentBar.close < upper[i]!;

        if (params.reverse) {
          if (standardBuy) d.sellSignal = currentBar.high;
          if (standardSell) d.buySignal = currentBar.low;
        } else {
          if (standardBuy) d.buySignal = currentBar.low;
          if (standardSell) d.sellSignal = currentBar.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default bollingerBandsStrategy;
