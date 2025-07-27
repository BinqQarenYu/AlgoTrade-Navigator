'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateSupertrend } from '@/lib/indicators';

export interface SmiMfiScalpParams {
  supertrendPeriod: number;
  supertrendMultiplier: number;
  reverse?: boolean;
  discipline: DisciplineParams;
}

export const defaultSmiMfiScalpParams: SmiMfiScalpParams = {
  supertrendPeriod: 10,
  supertrendMultiplier: 3,
  reverse: false,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const smiMfiScalpStrategy: Strategy = {
  id: 'smi-mfi-scalp',
  name: 'SMI MFI Scalp',
  description: 'A high-frequency scalping strategy that forces a trade decision on every candle based on the Supertrend indicator to determine the direction.',
  
  async calculate(data: HistoricalData[], userParams: Partial<SmiMfiScalpParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultSmiMfiScalpParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    
    if (data.length < params.supertrendPeriod) return dataWithIndicators;

    // 1. Pivot Point Supertrend for trend direction
    const { supertrend, direction: supertrendDirection } = calculateSupertrend(data, params.supertrendPeriod, params.supertrendMultiplier);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.supertrend = supertrend[i];
      d.supertrend_direction = supertrendDirection[i];

      if (i < 1) return;

      const trendDirection = supertrendDirection[i];
      if (trendDirection === null) return;

      // Trend Conditions - This is now the ONLY deciding factor
      const isInUptrend = trendDirection === 1;
      const isInDowntrend = trendDirection === -1;
      
      // Force a decision on every candle based on trend
      if (params.reverse) {
        // Trade against the trend
        if (isInUptrend) {
          d.sellSignal = d.close;
        }
        if (isInDowntrend) {
          d.buySignal = d.close;
        }
      } else {
        // Follow the trend
        if (isInUptrend) {
          d.buySignal = d.close;
        }
        if (isInDowntrend) {
          d.sellSignal = d.close;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default smiMfiScalpStrategy;
