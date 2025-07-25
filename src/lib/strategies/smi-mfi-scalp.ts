
'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateSupertrend, calculateMFI, calculateSMI, calculatePivotPoints } from '@/lib/indicators';

export interface SmiMfiScalpParams {
  supertrendPeriod: number;
  supertrendMultiplier: number;
  mfiPeriod: number;
  smiPeriod: number;
  smiEmaPeriod: number;
  overbought: number;
  oversold: number;
  reverse?: boolean;
  discipline: DisciplineParams;
}

export const defaultSmiMfiScalpParams: SmiMfiScalpParams = {
  supertrendPeriod: 10,
  supertrendMultiplier: 3,
  mfiPeriod: 14,
  smiPeriod: 5,
  smiEmaPeriod: 3,
  overbought: 40,
  oversold: -40,
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
  description: 'A high-frequency scalping strategy that forces a trade decision on every candle based on Pivot Supertrend for trend, and an SMI of MFI for confirmation.',
  
  async calculate(data: HistoricalData[], params: SmiMfiScalpParams = defaultSmiMfiScalpParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const requiredDataLength = Math.max(params.supertrendPeriod, params.mfiPeriod, params.smiPeriod + params.smiEmaPeriod);

    if (data.length < requiredDataLength) return dataWithIndicators;

    // 1. Pivot Point Supertrend for trend direction
    const { supertrend, direction: supertrendDirection } = calculateSupertrend(data, params.supertrendPeriod, params.supertrendMultiplier);

    // 2. SMI of MFI for entry signals
    const mfi = calculateMFI(data, params.mfiPeriod);
    const { smi } = calculateSMI(mfi, params.smiPeriod, params.smiEmaPeriod);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.supertrend = supertrend[i];
      d.supertrend_direction = supertrendDirection[i];
      d.smi = smi[i];

      if (i < 1) return;

      const prev = dataWithIndicators[i - 1];
      if (!supertrendDirection[i] || !smi[i]) {
        return;
      }

      // Trend Conditions
      const isInUptrend = supertrendDirection[i] === 1;
      const isInDowntrend = supertrendDirection[i] === -1;

      // Confirmation Conditions (SMI MFI)
      const isNotOverbought = smi[i]! < params.overbought;
      const isNotOversold = smi[i]! > params.oversold;
      
      // Final Signals - A decision is made on every candle
      const standardBuy = isInUptrend && isNotOverbought;
      const standardSell = isInDowntrend && isNotOversold;
      
      if (params.reverse) {
        if (standardBuy) {
          d.sellSignal = d.close;
        }
        if (standardSell) {
          d.buySignal = d.close;
        }
      } else {
        if (standardBuy) {
          d.buySignal = d.close;
        }
        if (standardSell) {
          d.sellSignal = d.close;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default smiMfiScalpStrategy;
