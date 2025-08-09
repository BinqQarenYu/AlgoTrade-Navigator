
'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateSupertrend, calculateMFI, calculateSMI } from '@/lib/indicators';

export interface SmiMfiSupertrendParams {
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

export const defaultSmiMfiSupertrendParams: SmiMfiSupertrendParams = {
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

const smiMfiSupertrendStrategy: Strategy = {
  id: 'smi-mfi-supertrend',
  name: 'SMI MFI + Pivot Supertrend',
  description: 'A trend-following strategy using Pivot Point Supertrend for trend and an SMI of MFI for entry signals.',
  
  async calculate(data: HistoricalData[], userParams: Partial<SmiMfiSupertrendParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultSmiMfiSupertrendParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const requiredDataLength = Math.max(params.supertrendPeriod, params.mfiPeriod, params.smiPeriod + params.smiEmaPeriod);

    if (data.length < requiredDataLength) return dataWithIndicators;

    // 1. Pivot Point Supertrend for trend direction
    const { supertrend, direction: supertrendDirection } = calculateSupertrend(data, params.supertrendPeriod, params.supertrendMultiplier);

    // 2. SMI of MFI for entry signals
    const mfi = calculateMFI(data, params.mfiPeriod);
    const { smi, signal: smiSignal } = calculateSMI(mfi, params.smiPeriod, params.smiEmaPeriod);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.supertrend = supertrend[i];
      d.supertrend_direction = supertrendDirection[i];
      d.smi = smi[i];
      d.smi_signal = smiSignal[i];
      d.mfi = mfi[i];

      if (i < 1) return;

      const prev = dataWithIndicators[i - 1];
      if (!prev.supertrend_direction || !supertrendDirection[i] || !prev.smi || !prev.smi_signal || !smi[i] || !smiSignal[i]) {
        return;
      }

      // Trend Conditions
      const isInUptrend = supertrendDirection[i] === 1;
      const isInDowntrend = supertrendDirection[i] === -1;

      // Entry Conditions (SMI of MFI crosses its signal line)
      const bullishSmiCross = prev.smi <= prev.smi_signal && smi[i]! > smiSignal[i]!;
      const bearishSmiCross = prev.smi >= prev.smi_signal && smi[i]! < smiSignal[i]!;

      // Oscillator level condition
      const isOversold = smi[i]! < params.oversold;
      const isOverbought = smi[i]! > params.overbought;

      // Final Signals
      const standardBuy = isInUptrend && bullishSmiCross && isOversold;
      const standardSell = isInDowntrend && bearishSmiCross && isOverbought;
      
      d.signal = null;
      if (standardBuy) {
        d.signal = 'BUY';
      }
      if (standardSell) {
        d.signal = 'SELL';
      }
    });

    return dataWithIndicators;
  },
};

export default smiMfiSupertrendStrategy;
