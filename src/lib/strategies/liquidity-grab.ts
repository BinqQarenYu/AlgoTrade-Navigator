
'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';

export interface LiquidityGrabParams {
  swingLookaround: number;
  confirmationCandles: number;
  maxSweepLookahead: number;
  discipline: DisciplineParams;
}

export const defaultLiquidityGrabParams: LiquidityGrabParams = {
  swingLookaround: 5,
  confirmationCandles: 3,
  maxSweepLookahead: 50,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 2,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

function isSwingHigh(data: HistoricalData[], index: number, lookaround: number): boolean {
    if (index < lookaround || index >= data.length - lookaround) return false;
    const currentHigh = data[index].high;
    for (let i = 1; i <= lookaround; i++) {
        if (data[index - i].high > currentHigh || data[index + i].high > currentHigh) {
            return false;
        }
    }
    return true;
}

function isSwingLow(data: HistoricalData[], index: number, lookaround: number): boolean {
    if (index < lookaround || index >= data.length - lookaround) return false;
    const currentLow = data[index].low;
    for (let i = 1; i <= lookaround; i++) {
        if (data[index - i].low < currentLow || data[index + i].low < currentLow) {
            return false;
        }
    }
    return true;
}


const liquidityGrabStrategy: Strategy = {
  id: 'liquidity-grab',
  name: 'Liquidity Grab',
  description: 'Identifies price sweeps below support or above resistance, then enters on a quick reversal, anticipating a trap.',
  async calculate(data: HistoricalData[], params: LiquidityGrabParams = defaultLiquidityGrabParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const { swingLookaround, confirmationCandles, maxSweepLookahead } = params;

    if (data.length < swingLookaround * 2 + confirmationCandles) return dataWithIndicators;

    mainLoop: for (let i = swingLookaround; i < data.length - swingLookaround; i++) {
      // Bearish Setup: Sweep a swing high
      if (isSwingHigh(data, i, swingLookaround)) {
        const swingHighPrice = data[i].high;
        // Look ahead for the sweep, up to maxSweepLookahead candles
        for (let j = i + 1; j < data.length && j < i + maxSweepLookahead; j++) {
          if (data[j].high > swingHighPrice) {
            // Sweep occurred at index j. Now check for a reclaim within `confirmationCandles`.
            for (let k = j + 1; k < j + 1 + confirmationCandles && k < data.length; k++) {
              if (data[k].close < swingHighPrice) {
                dataWithIndicators[k].sellSignal = data[k].high;
                dataWithIndicators[k].stopLossLevel = data[j].high; // SL above the sweep wick
                dataWithIndicators[k].peakPrice = swingHighPrice; // The level that was swept
                i = k; // Move master loop index forward
                continue mainLoop; // Restart search from the next candle
              }
            }
          }
        }
      }
      
      // Bullish Setup: Sweep a swing low
      if (isSwingLow(data, i, swingLookaround)) {
        const swingLowPrice = data[i].low;
        // Look ahead for the sweep
        for (let j = i + 1; j < data.length && j < i + maxSweepLookahead; j++) {
          if (data[j].low < swingLowPrice) {
            // Sweep occurred. Now check for a reclaim.
            for (let k = j + 1; k < j + 1 + confirmationCandles && k < data.length; k++) {
               if (data[k].close > swingLowPrice) {
                  dataWithIndicators[k].buySignal = data[k].low;
                  dataWithIndicators[k].stopLossLevel = data[j].low; // SL below the sweep wick
                  dataWithIndicators[k].peakPrice = swingLowPrice; // The level that was swept
                  i = k;
                  continue mainLoop;
               }
            }
          }
        }
      }
    }

    return dataWithIndicators;
  },
};

export default liquidityGrabStrategy;
