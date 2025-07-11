
'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateSupertrend, calculateMFI, calculateSMI, calculatePivotPoints } from '@/lib/indicators';

export interface SmiMfiSupertrendParams {
  supertrendPeriod: number;
  supertrendMultiplier: number;
  mfiPeriod: number;
  smiPeriod: number;
  smiEmaPeriod: number;
  overbought: number;
  oversold: number;
  reverse?: boolean;
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
};

const smiMfiSupertrendStrategy: Strategy = {
  id: 'smi-mfi-supertrend',
  name: 'SMI MFI + Pivot Supertrend',
  description: 'A trend-following strategy using Pivot Point Supertrend for trend and an SMI of MFI for entry signals.',
  
  async calculate(data: HistoricalData[], params: SmiMfiSupertrendParams = defaultSmiMfiSupertrendParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const requiredDataLength = Math.max(params.supertrendPeriod, params.mfiPeriod, params.smiPeriod + params.smiEmaPeriod);

    if (data.length < requiredDataLength) return dataWithIndicators;

    // 1. Pivot Point Supertrend for trend direction
    const pivotPoints = calculatePivotPoints(data, params.supertrendPeriod);
    const { supertrend, direction: supertrendDirection } = calculateSupertrend(data, params.supertrendPeriod, params.supertrendMultiplier);

    // 2. SMI of MFI for entry signals
    const mfi = calculateMFI(data, params.mfiPeriod);
    const { smi, signal: smiSignal } = calculateSMI(mfi, params.smiPeriod, params.smiEmaPeriod);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.supertrend = supertrend[i];
      d.supertrend_direction = supertrendDirection[i];
      d.smi = smi[i];
      d.smi_signal = smiSignal[i];
      d.pivot_point = pivotPoints.pp[i];

      if (i < 1) return;

      const prev = dataWithIndicators[i - 1];
      if (!prev.supertrend_direction || !supertrendDirection[i] || !prev.smi || !prev.smi_signal || !smi[i] || !smiSignal[i]) {
        return;
      }

      // Trend Conditions
      const isInUptrend = supertrendDirection[i] === 1;
      const isInDowntrend = supertrendDirection[i] === -1;

      // Entry Conditions (SMI MFI)
      const smiWasOversold = prev.smi <= params.oversold;
      const smiCrossedUp = prev.smi <= prev.smi_signal && smi[i]! > smiSignal[i]!;
      
      const smiWasOverbought = prev.smi >= params.overbought;
      const smiCrossedDown = prev.smi >= prev.smi_signal && smi[i]! < smiSignal[i]!;

      // Final Signals
      const standardBuy = isInUptrend && smiWasOversold && smiCrossedUp;
      const standardSell = isInDowntrend && smiWasOverbought && smiCrossedDown;
      
      if (params.reverse) {
        if (standardBuy) {
          d.sellSignal = d.high;
          d.stopLossLevel = d.high * 1.02; // Simple SL
        }
        if (standardSell) {
          d.buySignal = d.low;
          d.stopLossLevel = d.low * 0.98; // Simple SL
        }
      } else {
        if (standardBuy) {
          d.buySignal = d.low;
          d.stopLossLevel = d.low * 0.98; // Simple SL
        }
        if (standardSell) {
          d.sellSignal = d.high;
          d.stopLossLevel = d.high * 1.02; // Simple SL
        }
      }
    });

    return dataWithIndicators;
  },
};

export default smiMfiSupertrendStrategy;
