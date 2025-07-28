'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateBollingerBands } from '@/lib/indicators';

export interface BollingerBandsParams {
  period: number;
  stdDev: number;
  discipline: DisciplineParams;
}

export const defaultBollingerBandsParams: BollingerBandsParams = {
  period: 20,
  stdDev: 2,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const bollingerBandsStrategy: Strategy = {
  id: 'bollinger-bands',
  name: 'Bollinger Bands Reversion',
  description: 'A mean-reversion strategy that enters trades when price touches an outer band and then reverts towards the middle band.',
  async calculate(data: HistoricalData[], userParams: Partial<BollingerBandsParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultBollingerBandsParams, ...userParams };
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

        if (prevBar.low <= lower[i-1]! && currentBar.close > lower[i]!) {
          d.bullish_event = true;
        }
        if (prevBar.high >= upper[i-1]! && currentBar.close < upper[i]!) {
          d.bearish_event = true;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default bollingerBandsStrategy;
