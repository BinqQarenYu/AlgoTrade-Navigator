'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateCCI, calculateEMA } from '@/lib/indicators';

/**
 * CCI STATISTICAL MEAN ENGINE
 * A masterpiece in mean-reversion logic: Entry on exhaustion, Exit on normalization.
 */

export interface CciMeanEngineParams {
  cciPeriod: number;
  overbought: number;
  oversold: number;
  trendPeriod: number;
  requireTrend: boolean;
  discipline: DisciplineParams;
  // Microstructure Filters (Institutional Safeguards)
  maxVpin: number;         // Avoid toxic flow (Informed traders trend)
  minEntropy: number;      // Avoid bot noise / padding
  avoidSpoofing: boolean;  // Do not enter if phantom walls are active
  avoidTraps: boolean;    // Do not enter if sentiment diverges from skew
  avoidIcebergs: boolean; // Do not enter against hidden absorption
}

export const defaultCciMeanEngineParams: CciMeanEngineParams = {
  cciPeriod: 20,
  overbought: 100,
  oversold: -100,
  trendPeriod: 200,
  requireTrend: true,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 3,
    cooldownPeriodMinutes: 45,
    dailyDrawdownLimit: 4,
    onFailure: 'Cooldown',
  },
  maxVpin: 0.7,
  minEntropy: 3.0,
  avoidSpoofing: true,
  avoidTraps: true,
  avoidIcebergs: true,
};

const cciMeanEngine: Strategy = {
  id: 'cci-mean-engine',
  name: 'CCI Statistical Mean Engine',
  description: 'Institutional-grade mean reversion: Entering on exhaustion and exiting precisely at the statistical mean.',

  async calculate(data: HistoricalData[], params: CciMeanEngineParams = defaultCciMeanEngineParams): Promise<HistoricalData[]> {
    // 1. Safety check: Ensure sufficient data exists for both indicators
    const minRequired = Math.max(params.cciPeriod, params.trendPeriod);
    if (!data || data.length < minRequired) {
      return data ? data.map(d => ({ ...d })) : [];
    }

    // 2. Pre-calculate indicators (Calculated once outside the loop for O(n) complexity)
    const cci = calculateCCI(data, params.cciPeriod);
    const ema200 = calculateEMA(data.map(d => d.close), params.trendPeriod);

    // 3. Map signals efficiently
    return data.map((d, i) => {
      // Shallow copy of the candle to avoid mutating the original reference
      const currentCandle: HistoricalData & { cci?: number | null } = { 
        ...d, 
        cci: cci[i] 
      };
      
      // We need at least one previous candle to detect a "Cross"
      if (i < 1 || cci[i] === null || cci[i - 1] === null) {
        return currentCandle;
      }

      const currCCI = cci[i]!;
      const prevCCI = cci[i - 1]!;
      const trendLine = ema200[i] || 0;

      // Filter: Price relative to the long-term trend
      const isAboveTrend = d.close > trendLine;
      const isBelowTrend = d.close < trendLine;

      /**
       * ENTRY RULES
       * We buy/sell when CCI crosses back into the "Normal" range from an extreme.
       */
      const longEntryTrigger = prevCCI <= params.oversold && currCCI > params.oversold;
      const shortEntryTrigger = prevCCI >= params.overbought && currCCI < params.overbought;

      /**
       * MICROSTRUCTURE FILTERS (The Institutional Hedge)
       * We ignore signals if the flow is too toxic or synthetic.
       */
      const ms = d.microstructure;
      const isToxic = ms ? (ms.vpin || 0) > params.maxVpin : false;
      const isSynthetic = ms ? (ms.entropyScore || 5) < params.minEntropy : false;
      const isSpoofed = ms ? (params.avoidSpoofing && ms.isSpoofing) : false;
      const isTrapped = ms ? (params.avoidTraps && ms.isToxicTrap) : false;
      const hasIceberg = ms ? (params.avoidIcebergs && ms.isIceberg) : false;

      const isFlowSafe = !isToxic && !isSynthetic && !isSpoofed && !isTrapped && !hasIceberg;

      if (longEntryTrigger && isFlowSafe && (params.requireTrend ? isAboveTrend : true)) {
        currentCandle.buySignal = d.low;
      }

      if (shortEntryTrigger && isFlowSafe && (params.requireTrend ? isBelowTrend : true)) {
        currentCandle.sellSignal = d.high;
      }

      /**
       * EXIT RULES (The Quant Secret)
       * We exit when CCI returns to 0. This is the point of zero statistical advantage.
       */
      const crossingZeroUp = prevCCI < 0 && currCCI >= 0;
      const crossingZeroDown = prevCCI > 0 && currCCI <= 0;

      if (crossingZeroUp) currentCandle.exitLongSignal = d.high;
      if (crossingZeroDown) currentCandle.exitShortSignal = d.low;

      return currentCandle;
    });
  },
};

export default cciMeanEngine;
