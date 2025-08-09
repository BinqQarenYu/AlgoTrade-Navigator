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

    const { supertrend, direction: supertrendDirection } = calculateSupertrend(data, params.supertrendPeriod, params.supertrendMultiplier);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.supertrend = supertrend[i];
      d.supertrend_direction = supertrendDirection[i];

      if (i < 1) return;

      const trendDirection = supertrendDirection[i];
      if (trendDirection === null) return;

      // Corrected Logic: Generate a neutral event based on the trend direction of the current candle.
      const isInUptrend = trendDirection === 1;
      const isInDowntrend = trendDirection === -1;
      
      d.signal = null;
      if (isInUptrend) {
          d.signal = 'BUY';
      } else if (isInDowntrend) {
          d.signal = 'SELL';
      }
    });

    return dataWithIndicators;
  },
};

export default smiMfiScalpStrategy;
