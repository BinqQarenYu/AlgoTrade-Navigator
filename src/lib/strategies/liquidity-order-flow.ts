// src/lib/strategies/liquidity-order-flow.ts
'use client';

import type { HistoricalData, Strategy, DisciplineParams } from '../types';
import { calculateEMA, findFVGs } from '../indicators';

export interface LiquidityOrderFlowParams {
  swingLookaround: number;
  emaTrendPeriod: number;
  maxLookahead: number;
  discipline: DisciplineParams;
}

export const defaultLiquidityOrderFlowParams: LiquidityOrderFlowParams = {
  swingLookaround: 5,
  emaTrendPeriod: 200,
  maxLookahead: 50,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

/**
 * Finds local swing highs in the dataset.
 * A swing high is defined as a peak where 'lookaround' candles before and after have lower highs.
 * @param data Array of HistoricalData
 * @param lookaround Number of adjacent candles to check
 * @returns Array of indices representing the swing highs
 */
function findSwingHighs(data: HistoricalData[], lookaround: number): number[] {
  const swingHighs: number[] = [];
  for (let i = lookaround; i < data.length - lookaround; i++) {
    let isSwingHigh = true;
    for (let j = 1; j <= lookaround; j++) {
      if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) {
        isSwingHigh = false;
        break;
      }
    }
    if (isSwingHigh) swingHighs.push(i);
  }
  return swingHighs;
}

/**
 * Finds local swing lows in the dataset.
 * A swing low is defined as a trough where 'lookaround' candles before and after have higher lows.
 * @param data Array of HistoricalData
 * @param lookaround Number of adjacent candles to check
 * @returns Array of indices representing the swing lows
 */
function findSwingLows(data: HistoricalData[], lookaround: number): number[] {
  const swingLows: number[] = [];
  for (let i = lookaround; i < data.length - lookaround; i++) {
    let isSwingLow = true;
    for (let j = 1; j <= lookaround; j++) {
      if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) {
        isSwingLow = false;
        break;
      }
    }
    if (isSwingLow) swingLows.push(i);
  }
  return swingLows;
}

/**
 * Binary search helper: finds the maximum element in a sorted array that is strictly less than 'val'.
 * Reduces O(N) array filtering to O(log N).
 */
function findLastLessThan(arr: number[], val: number): number | undefined {
  let low = 0;
  let high = arr.length - 1;
  let result = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (arr[mid] < val) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return result !== -1 ? arr[result] : undefined;
}

type FVG = { index: number; type: 'bullish' | 'bearish'; top: number; bottom: number; };

/**
 * Binary search helper: finds the most recent Fair Value Gap of a specific type within a bounded range (minIdx, maxIdx).
 * Avoids O(N) memory allocation and traversal from the native array .filter() and .pop() combo.
 */
function findLastFvgBetween(fvgs: FVG[], type: 'bullish' | 'bearish', minIdx: number, maxIdx: number): FVG | undefined {
  let low = 0;
  let high = fvgs.length - 1;
  let firstGte = fvgs.length;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (fvgs[mid].index >= maxIdx) {
      firstGte = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  for (let i = firstGte - 1; i >= 0; i--) {
    const fvg = fvgs[i];
    if (fvg.index <= minIdx) break;
    if (fvg.type === type && fvg.index > minIdx && fvg.index < maxIdx) {
      return fvg;
    }
  }
  return undefined;
}

const liquidityOrderFlowStrategy: Strategy = {
  id: 'liquidity-order-flow',
  name: 'Liquidity & Order Flow',
  description: 'A professional-grade strategy that identifies liquidity sweeps, confirms them with volume analysis, waits for a market structure shift, and seeks entry on a pullback to a Fair Value Gap.',
  
  /**
   * Main calculation engine for the Liquidity & Order Flow strategy.
   * Optimized with sets for O(1) lookups and binary search for look-back constraints, eliminating massive scaling bottlenecks.
   */
  async calculate(data: HistoricalData[], params: LiquidityOrderFlowParams = defaultLiquidityOrderFlowParams): Promise<HistoricalData[]> {
    const dataWithIndicators = data.map(d => ({ ...d })); // Shallow copy for mutation
    if (data.length < params.emaTrendPeriod) return dataWithIndicators;

    // Calculate Trend indicator for visualization
    const closePrices = data.map(d => d.close);
    const trendEma = calculateEMA(closePrices, params.emaTrendPeriod);
    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.ema_long = trendEma[i];
    });

    // Extract pivotal market features
    const swingHighs = findSwingHighs(data, params.swingLookaround);
    const swingLows = findSwingLows(data, params.swingLookaround);
    const fvgs = findFVGs(data) as FVG[];

    // Convert to Sets for O(1) containment checks, removing nested O(N) array.find calls
    const swingHighsSet = new Set(swingHighs);
    const swingLowsSet = new Set(swingLows);

    for (let i = params.swingLookaround; i < data.length - params.maxLookahead; i++) {

      // --- Bearish Setup (Short) ---
      if (swingHighsSet.has(i)) {
        const swingHighPrice = data[i].high;

        // Scan ahead for a Liquidity Grab
        for (let j = i + 1; j < i + params.maxLookahead && j < data.length; j++) {
          if (data[j].high > swingHighPrice) { // 1. Liquidity Grab detected
            const sweepVolume = data[j].volume;

            // O(log N) lookup instead of O(N) filter + pop
            const lastSwingLowBeforeGrab = findLastLessThan(swingLows, j);
            if (lastSwingLowBeforeGrab === undefined) continue;

            // Scan ahead for Market Structure Shift (MSS)
            for (let k = j + 1; k < j + params.maxLookahead && k < data.length; k++) {
              if (data[k].close < data[lastSwingLowBeforeGrab].low) { // 2. MSS detected
                const mssVolume = data[k].volume;

                // Volume confirmation: reversal volume should be less than sweep volume to validate exhaustion
                if (mssVolume >= sweepVolume) continue;

                // O(log N) FVG lookup replacing O(N) filtering
                const relevantFvg = findLastFvgBetween(fvgs, 'bearish', lastSwingLowBeforeGrab, k);
                
                if (relevantFvg) {
                  // Scan for pullback entry into the FVG
                  for (let l = k + 1; l < k + params.maxLookahead && l < data.length; l++) {
                    if (data[l].high >= relevantFvg.bottom && data[l].high <= relevantFvg.top) { // 3. Entry point found
                      dataWithIndicators[l].sellSignal = data[l].high;
                      dataWithIndicators[l].stopLossLevel = swingHighPrice;
                      break;
                    }
                    if (data[l].high > swingHighPrice) break; // Setup invalidated if price breaks the swing high
                  }
                }
                break; // Proceed past MSS
              }
            }
            break; // Proceed past Liquidity Grab
          }
        }
      }

      // --- Bullish Setup (Long) ---
      if (swingLowsSet.has(i)) {
        const swingLowPrice = data[i].low;

        // Scan ahead for a Liquidity Grab
        for (let j = i + 1; j < i + params.maxLookahead && j < data.length; j++) {
          if (data[j].low < swingLowPrice) { // 1. Liquidity Grab detected
            const sweepVolume = data[j].volume;

            // O(log N) lookup
            const lastSwingHighBeforeGrab = findLastLessThan(swingHighs, j);
            if (lastSwingHighBeforeGrab === undefined) continue;

            // Scan ahead for Market Structure Shift (MSS)
            for (let k = j + 1; k < j + params.maxLookahead && k < data.length; k++) {
              if (data[k].close > data[lastSwingHighBeforeGrab].high) { // 2. MSS detected
                const mssVolume = data[k].volume;

                // Volume confirmation
                if (mssVolume >= sweepVolume) continue;

                // O(log N) FVG lookup
                const relevantFvg = findLastFvgBetween(fvgs, 'bullish', lastSwingHighBeforeGrab, k);
                
                if (relevantFvg) {
                  // Scan for pullback entry into the FVG
                  for (let l = k + 1; l < k + params.maxLookahead && l < data.length; l++) {
                    if (data[l].low <= relevantFvg.top && data[l].low >= relevantFvg.bottom) { // 3. Entry point found
                      dataWithIndicators[l].buySignal = data[l].low;
                      dataWithIndicators[l].stopLossLevel = swingLowPrice;
                      break;
                    }
                    if (data[l].low < swingLowPrice) break; // Setup invalidated if price breaks the swing low
                  }
                }
                break;
              }
            }
            break;
          }
        }
      }
    }

    return dataWithIndicators;
  },
};

export default liquidityOrderFlowStrategy;
