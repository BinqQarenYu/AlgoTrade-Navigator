
'use client';

import type { HistoricalData } from './types';

/**
 * Calculates the Simple Moving Average (SMA) for a given set of data.
 * @param data An array of numbers (e.g., closing prices).
 * @param period The number of periods to average over.
 * @returns An array of SMA values, with initial values as null.
 */
export const calculateSMA = (data: number[], period: number): (number | null)[] => {
  if (data.length < period) return Array(data.length).fill(null);
  
  const sma: (number | null)[] = Array(period - 1).fill(null);
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    sma.push(sum / period);
  }
  return sma;
};

/**
 * Calculates the Exponential Moving Average (EMA) for a given set of data.
 * @param data An array of numbers (e.g., closing prices).
 * @param period The number of periods for the EMA.
 * @returns An array of EMA values, with initial values as null.
 */
export const calculateEMA = (data: number[], period: number): (number | null)[] => {
  if (data.length < period) return Array(data.length).fill(null);

  const ema: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  let prevEma: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(null);
      continue;
    }
    if (i === period - 1) {
      const slice = data.slice(0, period);
      const sum = slice.reduce((acc, val) => acc + val, 0);
      prevEma = sum / period; // Start with SMA
      ema.push(prevEma);
    } else {
      const currentEma = (data[i] - prevEma!) * multiplier + prevEma!;
      ema.push(currentEma);
      prevEma = currentEma;
    }
  }
  return ema;
};

/**
 * Calculates the Relative Strength Index (RSI) for a given set of data.
 * @param data An array of numbers (e.g., closing prices).
 * @param period The number of periods for the RSI (default is 14).
 * @returns An array of RSI values, with initial values as null.
 */
export const calculateRSI = (data: number[], period: number = 14): (number | null)[] => {
  const rsi: (number | null)[] = Array(period).fill(null);
  if (data.length <= period) return Array(data.length).fill(null);

  let gains: number[] = [];
  let losses: number[] = [];

  // Calculate initial average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) {
      gains.push(change);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(change));
    }
  }

  let avgGain = gains.reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < data.length; i++) {
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss; // Prevent division by zero
    rsi.push(100 - (100 / (1 + rs)));

    // Calculate next gain/loss for smoothing
    if (i < data.length - 1) {
      const change = data[i + 1] - data[i];
      const currentGain = change > 0 ? change : 0;
      const currentLoss = change < 0 ? Math.abs(change) : 0;
      avgGain = (avgGain * (period - 1) + currentGain) / period;
      avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    }
  }

  return rsi;
};


export const calculateStandardDeviation = (data: number[], period: number): (number | null)[] => {
    if (data.length < period) return Array(data.length).fill(null);
    const stdDev: (number | null)[] = Array(period - 1).fill(null);
    for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1);
        const mean = slice.reduce((acc, val) => acc + val, 0) / period;
        const variance = slice.reduce((acc, val) => acc + (val - mean) ** 2, 0) / period;
        stdDev.push(Math.sqrt(variance));
    }
    return stdDev;
};

export const calculateBollingerBands = (data: number[], period: number, stdDevMultiplier: number): { upper: (number | null)[], middle: (number | null)[], lower: (number | null)[] } => {
    const middle = calculateSMA(data, period);
    const stdDev = calculateStandardDeviation(data, period);
    const upper = middle.map((val, i) => val !== null && stdDev[i] !== null ? val + (stdDev[i]! * stdDevMultiplier) : null);
    const lower = middle.map((val, i) => val !== null && stdDev[i] !== null ? val - (stdDev[i]! * stdDevMultiplier) : null);
    return { upper, middle, lower };
};

export const calculateMACD = (data: number[], shortPeriod: number, longPeriod: number, signalPeriod: number): { macd: (number | null)[], signal: (number | null)[], histogram: (number | null)[] } => {
    const emaShort = calculateEMA(data, shortPeriod);
    const emaLong = calculateEMA(data, longPeriod);
    const macdLine = emaShort.map((shortVal, i) => {
        const longVal = emaLong[i];
        if (shortVal !== null && longVal !== null) {
            return shortVal - longVal;
        }
        return null;
    });

    const validMacd = macdLine.filter((v): v is number => v !== null);
    // Pad the start of the valid macd values with nulls to align with original data length
    const padding = macdLine.length - validMacd.length;
    const signalLinePadded = [...Array(padding).fill(null), ...calculateEMA(validMacd, signalPeriod)];
    
    const histogram = macdLine.map((macdVal, i) => {
        const signalVal = signalLinePadded[i];
        if (macdVal !== null && signalVal !== null) {
            return macdVal - signalVal;
        }
        return null;
    });

    return { macd: macdLine, signal: signalLinePadded, histogram };
};

export const calculateATR = (data: HistoricalData[], period: number): (number | null)[] => {
    if (data.length <= period) return Array(data.length).fill(null);
    const atr: (number | null)[] = [];
    let prevAtr: number | null = null;
    
    // Calculate initial ATR
    let initialTrSum = 0;
    for (let i = 1; i <= period; i++) {
        const high = data[i].high;
        const low = data[i].low;
        const prevClose = data[i-1].close;
        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        initialTrSum += tr;
    }
    prevAtr = initialTrSum / period;
    
    for (let i = 0; i < data.length; i++) {
        if(i < period) {
            atr.push(null);
            continue;
        }
        if(i === period) {
            atr.push(prevAtr);
            continue;
        }

        const high = data[i].high;
        const low = data[i].low;
        const prevClose = data[i-1].close;
        const currentTr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        
        const currentAtr = ((prevAtr! * (period - 1)) + currentTr) / period;
        atr.push(currentAtr);
        prevAtr = currentAtr;
    }
    return atr;
};


export const calculateSupertrend = (data: HistoricalData[], period: number, multiplier: number): { supertrend: (number | null)[], direction: (number | null)[] } => {
    const atrValues = calculateATR(data, period);
    const supertrend: (number | null)[] = [];
    const direction: (number | null)[] = [];

    let trendDirection = 1;
    let finalUpperBand: number | null = null;
    let finalLowerBand: number | null = null;

    for (let i = 0; i < data.length; i++) {
        if (atrValues[i] === null) {
            supertrend.push(null);
            direction.push(null);
            continue;
        }

        const high = data[i].high;
        const low = data[i].low;
        const close = data[i].close;
        const hl2 = (high + low) / 2;

        const basicUpperBand = hl2 + multiplier * atrValues[i]!;
        const basicLowerBand = hl2 - multiplier * atrValues[i]!;

        if (i > 0) {
            const prevClose = data[i-1].close;
            finalUpperBand = (basicUpperBand < finalUpperBand! || prevClose > finalUpperBand!) ? basicUpperBand : finalUpperBand!;
            finalLowerBand = (basicLowerBand > finalLowerBand! || prevClose < finalLowerBand!) ? basicLowerBand : finalLowerBand!;

            if (close > finalUpperBand) {
                trendDirection = 1;
            } else if (close < finalLowerBand) {
                trendDirection = -1;
            }
        } else {
            finalUpperBand = basicUpperBand;
            finalLowerBand = basicLowerBand;
        }

        if (trendDirection === 1) {
            supertrend.push(finalLowerBand);
        } else {
            supertrend.push(finalUpperBand);
        }
        direction.push(trendDirection);
    }
    return { supertrend, direction };
};

export const calculateDonchianChannels = (
  highs: number[],
  lows: number[],
  period: number
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } => {
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const middle: (number | null)[] = [];

  for (let i = 0; i < highs.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
      middle.push(null);
    } else {
      const highSlice = highs.slice(i - period + 1, i + 1);
      const lowSlice = lows.slice(i - period + 1, i + 1);
      const upperBand = Math.max(...highSlice);
      const lowerBand = Math.min(...lowSlice);
      upper.push(upperBand);
      lower.push(lowerBand);
      middle.push((upperBand + lowerBand) / 2);
    }
  }
  return { upper, middle, lower };
};

export const calculateIchimokuCloud = (
  data: HistoricalData[],
  tenkanPeriod: number,
  kijunPeriod: number,
  senkouBPeriod: number,
  displacement: number
): { tenkan: (number | null)[]; kijun: (number | null)[]; senkouA: (number | null)[]; senkouB: (number | null)[]; chikou: (number | null)[] } => {
  const result = {
    tenkan: Array(data.length).fill(null),
    kijun: Array(data.length).fill(null),
    senkouA: Array(data.length).fill(null),
    senkouB: Array(data.length).fill(null),
    chikou: Array(data.length).fill(null),
  };

  for (let i = 0; i < data.length; i++) {
    // Tenkan-sen (Conversion Line)
    if (i >= tenkanPeriod - 1) {
      const slice = data.slice(i - tenkanPeriod + 1, i + 1);
      const highestHigh = Math.max(...slice.map(d => d.high));
      const lowestLow = Math.min(...slice.map(d => d.low));
      result.tenkan[i] = (highestHigh + lowestLow) / 2;
    }

    // Kijun-sen (Base Line)
    if (i >= kijunPeriod - 1) {
      const slice = data.slice(i - kijunPeriod + 1, i + 1);
      const highestHigh = Math.max(...slice.map(d => d.high));
      const lowestLow = Math.min(...slice.map(d => d.low));
      result.kijun[i] = (highestHigh + lowestLow) / 2;
    }
  }

  // This loop calculates the forward-shifted spans.
  // It populates future indexes of the result arrays.
  for (let i = 0; i < data.length; i++) {
    // Senkou Span A (Leading Span A)
    if (result.tenkan[i] !== null && result.kijun[i] !== null) {
      const val = (result.tenkan[i]! + result.kijun[i]!) / 2;
      if (i + displacement < data.length) {
        result.senkouA[i + displacement] = val;
      }
    }

    // Senkou Span B (Leading Span B)
    if (i >= senkouBPeriod - 1) {
      const slice = data.slice(i - senkouBPeriod + 1, i + 1);
      const highestHigh = Math.max(...slice.map(d => d.high));
      const lowestLow = Math.min(...slice.map(d => d.low));
      const val = (highestHigh + lowestLow) / 2;
      if (i + displacement < data.length) {
        result.senkouB[i + displacement] = val;
      }
    }

    // Chikou Span (Lagging Span) - This value is for i, but needs to be plotted at i-displacement
    // For simplicity in data structure, we place the current close in the chikou array at i-displacement index.
    if (i - displacement >= 0) {
       result.chikou[i-displacement] = data[i].close;
    }
  }

  return result;
};
