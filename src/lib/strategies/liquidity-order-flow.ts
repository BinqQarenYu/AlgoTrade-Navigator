
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

const liquidityOrderFlowStrategy: Strategy = {
  id: 'liquidity-order-flow',
  name: 'Liquidity & Order Flow',
  description: 'A professional-grade strategy that identifies liquidity sweeps, confirms them with volume analysis, waits for a market structure shift, and seeks entry on a pullback to a Fair Value Gap.',
  
  async calculate(data: HistoricalData[], params: LiquidityOrderFlowParams = defaultLiquidityOrderFlowParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    if (data.length < params.emaTrendPeriod) return dataWithIndicators;

    const closePrices = data.map(d => d.close);
    const trendEma = calculateEMA(closePrices, params.emaTrendPeriod);
    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.ema_long = trendEma[i]; // Use ema_long for visualization
    });

    const swingHighs = findSwingHighs(data, params.swingLookaround);
    const swingLows = findSwingLows(data, params.swingLookaround);
    const fvgs = findFVGs(data);

    for (let i = params.swingLookaround; i < data.length - params.maxLookahead; i++) {
      // --- Bearish Setup (Short) ---
      const lastSwingHighIndex = swingHighs.find(sh => sh === i);
      if (lastSwingHighIndex) {
        const swingHighPrice = data[lastSwingHighIndex].high;
        for (let j = lastSwingHighIndex + 1; j < lastSwingHighIndex + params.maxLookahead && j < data.length; j++) {
          if (data[j].high > swingHighPrice) { // 1. Liquidity Grab
            const sweepVolume = data[j].volume;
            const lastSwingLowBeforeGrab = swingLows.filter(sl => sl < j).pop();
            if (!lastSwingLowBeforeGrab) continue;

            for (let k = j + 1; k < j + params.maxLookahead && k < data.length; k++) {
              if (data[k].close < data[lastSwingLowBeforeGrab].low) { // 2. Market Structure Shift
                const mssVolume = data[k].volume;

                // Volume confirmation: reversal volume should be less than sweep volume
                if (mssVolume >= sweepVolume) continue;

                const bearishFvgs = fvgs.filter(f => f.type === 'bearish' && f.index > lastSwingLowBeforeGrab && f.index < k);
                const relevantFvg = bearishFvgs.pop(); // Get the last FVG created
                
                if (relevantFvg) {
                  for (let l = k + 1; l < k + params.maxLookahead && l < data.length; l++) {
                    if (data[l].high >= relevantFvg.bottom && data[l].high <= relevantFvg.top) { // 3. Entry on FVG pullback
                      dataWithIndicators[l].sellSignal = data[l].high;
                      dataWithIndicators[l].stopLossLevel = swingHighPrice;
                      break; // Found entry, break inner loop
                    }
                    if (data[l].high > swingHighPrice) break; // Invalidated
                  }
                }
                break; // Found MSS, break loop
              }
            }
            break; // Found grab, break loop
          }
        }
      }

      // --- Bullish Setup (Long) ---
      const lastSwingLowIndex = swingLows.find(sl => sl === i);
      if (lastSwingLowIndex) {
        const swingLowPrice = data[lastSwingLowIndex].low;
        for (let j = lastSwingLowIndex + 1; j < lastSwingLowIndex + params.maxLookahead && j < data.length; j++) {
          if (data[j].low < swingLowPrice) { // 1. Liquidity Grab
            const sweepVolume = data[j].volume;
            const lastSwingHighBeforeGrab = swingHighs.filter(sh => sh < j).pop();
            if (!lastSwingHighBeforeGrab) continue;

            for (let k = j + 1; k < j + params.maxLookahead && k < data.length; k++) {
              if (data[k].close > data[lastSwingHighBeforeGrab].high) { // 2. Market Structure Shift
                const mssVolume = data[k].volume;
                // Volume confirmation: reversal volume should be less than sweep volume
                if (mssVolume >= sweepVolume) continue;

                const bullishFvgs = fvgs.filter(f => f.type === 'bullish' && f.index > lastSwingHighBeforeGrab && f.index < k);
                const relevantFvg = bullishFvgs.pop();
                
                if (relevantFvg) {
                  for (let l = k + 1; l < k + params.maxLookahead && l < data.length; l++) {
                    if (data[l].low <= relevantFvg.top && data[l].low >= relevantFvg.bottom) { // 3. Entry
                      dataWithIndicators[l].buySignal = data[l].low;
                      dataWithIndicators[l].stopLossLevel = swingLowPrice;
                      break;
                    }
                    if (data[l].low < swingLowPrice) break; // Invalidated
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
