'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateCCI } from '@/lib/indicators';

export interface CciReversionParams {
  period: number;
  overbought: number;
  oversold: number;
  discipline: DisciplineParams;
}

export const defaultCciReversionParams: CciReversionParams = {
  period: 20,
  overbought: 100,
  oversold: -100,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const cciReversionStrategy: Strategy = {
  id: 'cci-reversion',
  name: 'CCI Reversion',
  description: 'A mean-reversion strategy using the Commodity Channel Index (CCI) to find overbought/oversold conditions.',
  async calculate(data: HistoricalData[], userParams: Partial<CciReversionParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultCciReversionParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;

    const cci = calculateCCI(data, params.period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.cci = cci[i];
      if (i > 0 && cci[i-1] !== null && cci[i] !== null) {
        if (cci[i-1]! <= params.oversold && cci[i]! > params.oversold) {
          d.bullish_event = true;
        }
        if (cci[i-1]! >= params.overbought && cci[i]! < params.overbought) {
          d.bearish_event = true;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default cciReversionStrategy;
