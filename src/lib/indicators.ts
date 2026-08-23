'use client';

import type { HistoricalData } from './types';

/**
 * Internal helper to calculate sliding window maximum or minimum using a monotonic deque.
 * This achieves O(N) complexity for the entire dataset, compared to O(N * period).
 *
 * @param data Array of numbers to process
 * @param period The sliding window size
 * @param type 'max' for rolling maximum, 'min' for rolling minimum
 * @returns Array of (number | null) where null represents initial periods
 */
const calculateSlidingWindowExtreme = (data: number[], period: number, type: 'max' | 'min'): (number | null)[] => {
  if (data.length < period) return Array(data.length).fill(null);

  const results: (number | null)[] = Array(data.length).fill(null);
  const deque: number[] = []; // Stores indices
  let head = 0; // Use a head pointer to avoid O(P) shift() operations

  for (let i = 0; i < data.length; i++) {
    // Remove indices that are out of the current window
    if (deque.length > head && deque[head] <= i - period) {
      head++;
    }

    // Maintain monotonic property
    while (deque.length > head) {
      const lastIdx = deque[deque.length - 1];
      const shouldPop = type === 'max'
        ? data[i] >= data[lastIdx]
        : data[i] <= data[lastIdx];

      if (shouldPop) {
        deque.pop();
      } else {
        break;
      }
    }

    deque.push(i);

    // If window is full, the element at the head of deque is the extreme
    if (i >= period - 1) {
      results[i] = data[deque[head]];
    }
  }

  return results;
};

/**
 * Calculates the Simple Moving Average (SMA) for a given set of data.
 * @param data An array of numbers (e.g., closing prices).
 * @param period The number of periods to average over.
 * @returns An array of SMA values, with initial values as null.
 */
export const calculateSMA = (data: number[], period: number): (number | null)[] => {
  if (period <= 0 || !Number.isInteger(period)) {
    console.error(`Invalid period (${period}) provided to calculateSMA.`);
    return Array(data.length).fill(null);
  }
  if (data.length < period) return Array(data.length).fill(null);
  
  const sma: (number | null)[] = Array(period - 1).fill(null);
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  sma.push(sum / period);

  for (let i = period; i < data.length; i++) {
    sum = sum - data[i - period] + data[i];
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
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sum += data[i];
      ema.push(null);
      continue;
    }
    if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[j];
      }
      prevEma = sum / period;
      ema.push(prevEma);
    } else {
      const currentEma: number = (data[i] - prevEma!) * multiplier + prevEma!;
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
  if (data.length <= period || period <= 0) return Array(data.length).fill(null);

  const rsi: (number | null)[] = Array(period).fill(null);

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }

  avgGain /= period;
  avgLoss /= period;

  let firstRsi: number;
  if (avgLoss === 0 && avgGain === 0) {
    firstRsi = 50;
  } else if (avgLoss === 0) {
    firstRsi = 100;
  } else {
    const rs = avgGain / avgLoss;
    firstRsi = 100 - (100 / (1 + rs));
  }
  rsi.push(firstRsi);

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    let currentRsi: number;
    if (avgLoss === 0 && avgGain === 0) {
      currentRsi = 50;
    } else if (avgLoss === 0) {
      currentRsi = 100;
    } else {
      const rs = avgGain / avgLoss;
      currentRsi = 100 - (100 / (1 + rs));
    }
    rsi.push(currentRsi);
  }

  return rsi;
};

export const calculateStandardDeviation = (data: number[], period: number): (number | null)[] => {
    if (data.length < period) return Array(data.length).fill(null);
    const stdDev: (number | null)[] = Array(period - 1).fill(null);

    let sum = 0;
    let sumSq = 0;

    for (let i = 0; i < period; i++) {
        sum += data[i];
        sumSq += data[i] * data[i];
    }

    const calcStd = (s: number, sSq: number, p: number) => {
        const mean = s / p;
        const variance = (sSq / p) - (mean * mean);
        return Math.sqrt(Math.max(0, variance));
    };

    stdDev.push(calcStd(sum, sumSq, period));

    for (let i = period; i < data.length; i++) {
        sum = sum - data[i - period] + data[i];
        sumSq = sumSq - (data[i - period] * data[i - period]) + (data[i] * data[i]);
        stdDev.push(calcStd(sum, sumSq, period));
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
    const macdLine: (number | null)[] = emaShort.map((shortVal, i) => {
        const longVal = emaLong[i];
        if (shortVal !== null && longVal !== null) {
            return shortVal - longVal;
        }
        return null;
    });

    const validMacdValues: number[] = [];
    const validIndices: number[] = [];
    macdLine.forEach((val, idx) => {
        if (val !== null) {
            validMacdValues.push(val);
            validIndices.push(idx);
        }
    });

    const signalRaw = calculateEMA(validMacdValues, signalPeriod);
    const signalLinePadded: (number | null)[] = Array(macdLine.length).fill(null);

    signalRaw.forEach((sigVal, idx) => {
        if (sigVal !== null && idx < validIndices.length) {
            signalLinePadded[validIndices[idx]] = sigVal;
        }
    });
    
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
    if (data.length < period) return Array(data.length).fill(null);

    const trValues: number[] = [];
    for (let i = 0; i < data.length; i++) {
        const high = data[i].high;
        const low = data[i].low;
        if (i === 0) {
            trValues.push(high - low);
        } else {
            const prevClose = data[i - 1].close;
            trValues.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
        }
    }

    const atr: (number | null)[] = Array(period - 1).fill(null);
    let sumTr = 0;
    for (let i = 0; i < period; i++) {
        sumTr += trValues[i];
    }
    let currentAtr = sumTr / period;
    atr.push(currentAtr);

    for (let i = period; i < data.length; i++) {
        currentAtr = (currentAtr * (period - 1) + trValues[i]) / period;
        atr.push(currentAtr);
    }
    return atr;
};

export const calculateSupertrend = (data: HistoricalData[], period: number, multiplier: number): { supertrend: (number | null)[], direction: (number | null)[] } => {
    const atrValues = calculateATR(data, period);
    const supertrend: (number | null)[] = [];
    const direction: (number | null)[] = [];

    let trendDirection = 1;
    let prevFinalUpperBand: number | null = null;
    let prevFinalLowerBand: number | null = null;

    for (let i = 0; i < data.length; i++) {
        if (atrValues[i] === null) {
            supertrend.push(null);
            direction.push(null);
            continue;
        }

        const atr = atrValues[i]!;
        const hl2 = (data[i].high + data[i].low) / 2;
        const basicUpperBand = hl2 + multiplier * atr;
        const basicLowerBand = hl2 - multiplier * atr;

        let finalUpperBand: number;
        let finalLowerBand: number;

        if (prevFinalUpperBand === null || prevFinalLowerBand === null) {
            finalUpperBand = basicUpperBand;
            finalLowerBand = basicLowerBand;
        } else {
            const prevClose = data[i - 1].close;
            finalUpperBand = (basicUpperBand < prevFinalUpperBand || prevClose > prevFinalUpperBand) ? basicUpperBand : prevFinalUpperBand;
            finalLowerBand = (basicLowerBand > prevFinalLowerBand || prevClose < prevFinalLowerBand) ? basicLowerBand : prevFinalLowerBand;
        }

        if (i > 0 && supertrend[i - 1] !== null) {
            const prevSupertrend = supertrend[i - 1]!;
            const currentClose = data[i].close;

            if (prevSupertrend === prevFinalUpperBand && currentClose > finalUpperBand) {
                trendDirection = 1;
            } else if (prevSupertrend === prevFinalLowerBand && currentClose < finalLowerBand) {
                trendDirection = -1;
            }
        }

        const currentSupertrend = trendDirection === 1 ? finalLowerBand : finalUpperBand;
        supertrend.push(currentSupertrend);
        direction.push(trendDirection);

        prevFinalUpperBand = finalUpperBand;
        prevFinalLowerBand = finalLowerBand;
    }
    return { supertrend, direction };
};

export const calculateDonchianChannels = (data: HistoricalData[], period: number): { upper: (number | null)[], middle: (number | null)[], lower: (number | null)[] } => {
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);

  const upper = calculateSlidingWindowExtreme(highs, period, 'max');
  const lower = calculateSlidingWindowExtreme(lows, period, 'min');
  const middle = upper.map((u, i) => (u !== null && lower[i] !== null) ? (u + lower[i]!) / 2 : null);

  return { upper, middle, lower };
};

export const calculateIchimokuCloud = (
  data: HistoricalData[],
  tenkanPeriod: number,
  kijunPeriod: number,
  senkouBPeriod: number,
  displacement: number
): { tenkan: (number | null)[]; kijun: (number | null)[]; senkouA: (number | null)[]; senkouB: (number | null)[]; chikou: (number | null)[] } => {
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);

  const tenkanHigh = calculateSlidingWindowExtreme(highs, tenkanPeriod, 'max');
  const tenkanLow = calculateSlidingWindowExtreme(lows, tenkanPeriod, 'min');
  const tenkan = tenkanHigh.map((h, i) => (h !== null && tenkanLow[i] !== null) ? (h + tenkanLow[i]!) / 2 : null);

  const kijunHigh = calculateSlidingWindowExtreme(highs, kijunPeriod, 'max');
  const kijunLow = calculateSlidingWindowExtreme(lows, kijunPeriod, 'min');
  const kijun = kijunHigh.map((h, i) => (h !== null && kijunLow[i] !== null) ? (h + kijunLow[i]!) / 2 : null);

  const senkouBHigh = calculateSlidingWindowExtreme(highs, senkouBPeriod, 'max');
  const senkouBLow = calculateSlidingWindowExtreme(lows, senkouBPeriod, 'min');
  const senkouBBase = senkouBHigh.map((h, i) => (h !== null && senkouBLow[i] !== null) ? (h + senkouBLow[i]!) / 2 : null);

  const senkouA = Array(data.length).fill(null);
  const senkouB = Array(data.length).fill(null);
  const chikou = Array(data.length).fill(null);

  for (let i = 0; i < data.length; i++) {
    if (tenkan[i] !== null && kijun[i] !== null) {
      const val = (tenkan[i]! + kijun[i]!) / 2;
      if (i + displacement < data.length) {
        senkouA[i + displacement] = val;
      }
    }

    if (senkouBBase[i] !== null) {
      if (i + displacement < data.length) {
        senkouB[i + displacement] = senkouBBase[i];
      }
    }

    if (i - displacement >= 0) {
      chikou[i - displacement] = data[i].close;
    }
  }

  return { tenkan, kijun, senkouA, senkouB, chikou };
};

export const calculateStochastic = (data: HistoricalData[], period: number, smoothK: number, smoothD: number): { k: (number | null)[], d: (number | null)[] } => {
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const periodHighs = calculateSlidingWindowExtreme(highs, period, 'max');
    const periodLows = calculateSlidingWindowExtreme(lows, period, 'min');

    const rawK: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
        const highestHigh = periodHighs[i];
        const lowestLow = periodLows[i];

        if (highestHigh === null || lowestLow === null) {
            rawK.push(null);
            continue;
        }

        const range = highestHigh - lowestLow;
        const k = range > 0 ? ((data[i].close - lowestLow) / range) * 100 : 50;
        rawK.push(isNaN(k) ? 50 : Math.max(0, Math.min(100, k)));
    }

    const validKIndices: number[] = [];
    const validKValues: number[] = [];
    rawK.forEach((val, idx) => {
        if (val !== null) {
            validKValues.push(val);
            validKIndices.push(idx);
        }
    });

    const smoothedKRaw = calculateSMA(validKValues, smoothK);
    const kWithPadding: (number | null)[] = Array(data.length).fill(null);
    const validSmoothedKValues: number[] = [];
    const validSmoothedKIndices: number[] = [];

    smoothedKRaw.forEach((kVal, idx) => {
        if (kVal !== null && idx < validKIndices.length) {
            const originalIndex = validKIndices[idx];
            kWithPadding[originalIndex] = kVal;
            validSmoothedKValues.push(kVal);
            validSmoothedKIndices.push(originalIndex);
        }
    });

    const smoothedDRaw = calculateSMA(validSmoothedKValues, smoothD);
    const dWithPadding: (number | null)[] = Array(data.length).fill(null);

    smoothedDRaw.forEach((dVal, idx) => {
        if (dVal !== null && idx < validSmoothedKIndices.length) {
            dWithPadding[validSmoothedKIndices[idx]] = dVal;
        }
    });

    return { k: kWithPadding, d: dWithPadding };
};

export const calculateKeltnerChannels = (data: HistoricalData[], period: number, multiplier: number): { upper: (number | null)[], middle: (number | null)[], lower: (number | null)[] } => {
    const closePrices = data.map(d => d.close);
    const middle = calculateEMA(closePrices, period);
    const atr = calculateATR(data, period);
    const upper = middle.map((val, i) => val !== null && atr[i] !== null ? val + (atr[i]! * multiplier) : null);
    const lower = middle.map((val, i) => val !== null && atr[i] !== null ? val - (atr[i]! * multiplier) : null);
    return { upper, middle, lower };
};

export const calculateVWAP = (data: HistoricalData[], period: number): (number | null)[] => {
    const vwap: (number | null)[] = Array(period - 1).fill(null);
    let totalPV = 0;
    let totalVolume = 0;

    for (let i = 0; i < period; i++) {
        totalPV += ((data[i].high + data[i].low + data[i].close) / 3) * data[i].volume;
        totalVolume += data[i].volume;
    }
    vwap.push(totalVolume > 0 ? totalPV / totalVolume : null);

    for (let i = period; i < data.length; i++) {
        const outPV = ((data[i - period].high + data[i - period].low + data[i - period].close) / 3) * data[i - period].volume;
        const inPV = ((data[i].high + data[i].low + data[i].close) / 3) * data[i].volume;
        totalPV = totalPV - outPV + inPV;
        totalVolume = totalVolume - data[i - period].volume + data[i].volume;
        vwap.push(totalVolume > 0 ? totalPV / totalVolume : null);
    }
    return vwap;
};

export const calculateParabolicSAR = (data: HistoricalData[], afStart: number, afIncrement: number, afMax: number): { psar: (number | null)[], direction: (number | null)[] } => {
    const psar: (number | null)[] = [];
    const direction: (number | null)[] = [];
    let isRising = true;
    let af = afStart;
    let ep = data[0].high;
    let sar = data[0].low;

    for (let i = 1; i < data.length; i++) {
        psar.push(sar);
        direction.push(isRising ? 1 : -1);

        if (isRising) {
            sar = sar + af * (ep - sar);
            if (data[i].low < sar) {
                isRising = false;
                sar = ep;
                ep = data[i].low;
                af = afStart;
            } else {
                if (data[i].high > ep) {
                    ep = data[i].high;
                    af = Math.min(afMax, af + afIncrement);
                }
            }
        } else {
            sar = sar - af * (ep - sar);
            if (data[i].high > sar) {
                isRising = true;
                sar = ep;
                ep = data[i].high;
                af = afStart;
            } else {
                if (data[i].low < ep) {
                    ep = data[i].low;
                    af = Math.min(afMax, af + afIncrement);
                }
            }
        }
    }
    psar.push(sar);
    direction.push(isRising ? 1 : -1);
    return { psar, direction };
};

export const calculateMomentum = (data: number[], period: number): (number | null)[] => {
    const momentum: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period) {
            momentum.push(null);
        } else {
            momentum.push(data[i] - data[i - period]);
        }
    }
    return momentum;
};

export const calculateAwesomeOscillator = (data: HistoricalData[], shortPeriod: number, longPeriod: number): (number | null)[] => {
    const n = data.length;
    const maxPeriod = Math.max(shortPeriod, longPeriod);
    if (n < maxPeriod || shortPeriod <= 0 || longPeriod <= 0) {
        return Array(n).fill(null);
    }

    // Single-pass sliding window optimization:
    // Calculates Awesome Oscillator in O(N) time with zero intermediate array allocations
    // (eliminating medianPrices array mapping and dual calculateSMA passes).
    const result: (number | null)[] = Array(n).fill(null);
    let sumShort = 0;
    let sumLong = 0;

    for (let i = 0; i < n; i++) {
        const mp = (data[i].high + data[i].low) / 2;
        sumShort += mp;
        sumLong += mp;

        if (i >= shortPeriod) {
            sumShort -= (data[i - shortPeriod].high + data[i - shortPeriod].low) / 2;
        }

        if (i >= longPeriod) {
            sumLong -= (data[i - longPeriod].high + data[i - longPeriod].low) / 2;
        }

        if (i >= maxPeriod - 1) {
            result[i] = (sumShort / shortPeriod) - (sumLong / longPeriod);
        }
    }

    return result;
};

export const calculateWilliamsR = (data: HistoricalData[], period: number): (number | null)[] => {
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const periodHighs = calculateSlidingWindowExtreme(highs, period, 'max');
    const periodLows = calculateSlidingWindowExtreme(lows, period, 'min');

    const williamsR: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
        const highestHigh = periodHighs[i];
        const lowestLow = periodLows[i];

        if (highestHigh === null || lowestLow === null) {
            williamsR.push(null);
            continue;
        }

        const r = ((highestHigh - data[i].close) / (highestHigh - lowestLow)) * -100;
        williamsR.push(isNaN(r) ? -50 : r);
    }
    return williamsR;
};

export const calculateCCI = (data: HistoricalData[], period: number): (number | null)[] => {
    const cci: (number | null)[] = [];
    const typicalPrices = data.map(d => (d.high + d.low + d.close) / 3);
    const smaTp = calculateSMA(typicalPrices, period);

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1 || smaTp[i] === null) {
            cci.push(null);
            continue;
        }
        // Optimize CCI calculation by replacing slice() and reduce() with a direct index loop.
        // This eliminates garbage collection / heap allocation overhead and speeds up the calculation significantly.
        let sumAbsoluteDeviations = 0;
        const start = i - period + 1;
        const end = i + 1;
        const smaVal = smaTp[i]!;
        for (let j = start; j < end; j++) {
            sumAbsoluteDeviations += Math.abs(typicalPrices[j] - smaVal);
        }
        const meanDeviation = sumAbsoluteDeviations / period;
        const val = (typicalPrices[i] - smaTp[i]!) / (0.015 * meanDeviation);
        cci.push(meanDeviation > 0 ? val : 0);
    }
    return cci;
};

export const calculateHeikinAshi = (data: HistoricalData[]): HistoricalData[] => {
    const haData: HistoricalData[] = [];
    for (let i = 0; i < data.length; i++) {
        const d = data[i];
        const haClose = (d.open + d.high + d.low + d.close) / 4;
        const haOpen = i > 0 ? (haData[i-1].ha_open! + haData[i-1].ha_close!) / 2 : (d.open + d.close) / 2;
        const haHigh = Math.max(d.high, haOpen, haClose);
        const haLow = Math.min(d.low, haOpen, haClose);
        
        haData.push({
            ...d,
            ha_open: haOpen,
            ha_high: haHigh,
            ha_low: haLow,
            ha_close: haClose
        });
    }
    return haData;
};

export const calculateSmoothedHeikinAshi = (data: HistoricalData[], period: number): HistoricalData[] => {
    if (data.length < period) return data;
    
    // Smooth the OHLC components using EMA
    const opens = data.map(d => d.open);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const closes = data.map(d => d.close);
    
    const emaOpen = calculateEMA(opens, period);
    const emaHigh = calculateEMA(highs, period);
    const emaLow = calculateEMA(lows, period);
    const emaClose = calculateEMA(closes, period);
    
    const smoothedData: HistoricalData[] = [];
    for (let i = 0; i < data.length; i++) {
        if (emaOpen[i] === null || emaHigh[i] === null || emaLow[i] === null || emaClose[i] === null) {
            smoothedData.push({ ...data[i], ha_open: null, ha_high: null, ha_low: null, ha_close: null } as any);
            continue;
        }
        
        const sOpen = emaOpen[i]!;
        const sHigh = emaHigh[i]!;
        const sLow = emaLow[i]!;
        const sClose = emaClose[i]!;
        
        const haClose = (sOpen + sHigh + sLow + sClose) / 4;
        // Find previous valid smoothed HA data for haOpen calculation
        const prevIdx = i - 1;
        let prevHaOpen = sOpen;
        let prevHaClose = sClose;
        if (prevIdx >= 0 && smoothedData[prevIdx].ha_open !== null && smoothedData[prevIdx].ha_open !== undefined) {
            prevHaOpen = smoothedData[prevIdx].ha_open!;
            prevHaClose = smoothedData[prevIdx].ha_close!;
        } else {
            prevHaOpen = (sOpen + sClose) / 2;
            prevHaClose = haClose;
        }

        const haOpen = (prevHaOpen + prevHaClose) / 2;
        const haHigh = Math.max(sHigh, haOpen, haClose);
        const haLow = Math.min(sLow, haOpen, haClose);
        
        smoothedData.push({
            ...data[i],
            ha_open: haOpen,
            ha_high: haHigh,
            ha_low: haLow,
            ha_close: haClose
        });
    }
    return smoothedData;
};

export const calculatePivotPoints = (data: HistoricalData[], period: number): { pp: (number|null)[], s1: (number|null)[], s2: (number|null)[], s3: (number|null)[], r1: (number|null)[], r2: (number|null)[], r3: (number|null)[] } => {
    const pp: (number | null)[] = Array(data.length).fill(null);
    const s1: (number | null)[] = Array(data.length).fill(null);
    const s2: (number | null)[] = Array(data.length).fill(null);
    const s3: (number | null)[] = Array(data.length).fill(null);
    const r1: (number | null)[] = Array(data.length).fill(null);
    const r2: (number | null)[] = Array(data.length).fill(null);
    const r3: (number | null)[] = Array(data.length).fill(null);

    if (data.length < period) {
        return { pp, s1, s2, s3, r1, r2, r3 };
    }

    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);

    // Get rolling extremes of previous period using O(N) sliding window extreme calculation
    const rollingHighs = calculateSlidingWindowExtreme(highs, period, 'max');
    const rollingLows = calculateSlidingWindowExtreme(lows, period, 'min');

    for (let i = period; i < data.length; i++) {
        // Pivot points for candle i use high/low from previous period (i - period to i - 1)
        const high = rollingHighs[i - 1];
        const low = rollingLows[i - 1];
        const prevCandle = data[i - 1];

        if (high === null || low === null || !prevCandle) {
            continue;
        }

        const close = prevCandle.close;

        const ppVal = (high + low + close) / 3;
        const r1Val = (2 * ppVal) - low;
        const s1Val = (2 * ppVal) - high;
        const r2Val = ppVal + (high - low);
        const s2Val = ppVal - (high - low);
        const r3Val = high + 2 * (ppVal - low);
        const s3Val = low - 2 * (high - ppVal);

        pp[i] = ppVal;
        r1[i] = r1Val;
        s1[i] = s1Val;
        r2[i] = r2Val;
        s2[i] = s2Val;
        r3[i] = r3Val;
        s3[i] = s3Val;
    }
    return { pp, s1, s2, s3, r1, r2, r3 };
};

export const calculateOBV = (data: HistoricalData[]): (number | null)[] => {
    const obv: (number | null)[] = [0];
    for (let i = 1; i < data.length; i++) {
        if (data[i].close > data[i-1].close) {
            obv.push(obv[i-1]! + data[i].volume);
        } else if (data[i].close < data[i-1].close) {
            obv.push(obv[i-1]! - data[i].volume);
        } else {
            obv.push(obv[i-1]);
        }
    }
    return obv;
};

export const calculateCMF = (data: HistoricalData[], period: number): (number | null)[] => {
    const cmf: (number | null)[] = Array(period - 1).fill(null);
    const mfv: number[] = data.map(d => {
        const range = d.high - d.low;
        const multiplier = range > 0 ? ((d.close - d.low) - (d.high - d.close)) / range : 0;
        return multiplier * d.volume;
    });

    let sumMfv = 0;
    let sumVol = 0;

    for (let i = 0; i < period; i++) {
        sumMfv += mfv[i];
        sumVol += data[i].volume;
    }
    cmf.push(sumVol > 0 ? sumMfv / sumVol : null);

    for (let i = period; i < data.length; i++) {
        sumMfv = sumMfv - mfv[i - period] + mfv[i];
        sumVol = sumVol - data[i - period].volume + data[i].volume;
        cmf.push(sumVol > 0 ? sumMfv / sumVol : null);
    }
    return cmf;
};

export const calculateCoppockCurve = (data: number[], longRoC: number, shortRoC: number, wmaPeriod: number): (number | null)[] => {
    const base = (data.length > 0 && data[0] > 0) ? data[0] : 1;
    const roc1 = calculateMomentum(data.map(p => (p / base - 1) * 100), longRoC);
    const roc2 = calculateMomentum(data.map(p => (p / base - 1) * 100), shortRoC);
    
    const sumRoc = roc1.map((val, i) => val !== null && roc2[i] !== null ? val + roc2[i]! : null);
    
    const validSumRoc = sumRoc.filter((v): v is number => v !== null);
    const padding = sumRoc.length - validSumRoc.length;

    if (validSumRoc.length < wmaPeriod) {
        return Array(data.length).fill(null);
    }

    const wma: (number | null)[] = [];
    let num = 0;
    let den = 0;
    for (let j = 0; j < wmaPeriod; j++) {
        num += validSumRoc[j] * (j + 1);
        den += (j + 1);
    }
    wma.push(den > 0 ? num / den : null);

    // Optimize WMA loop to O(N) complexity using a sliding window calculation
    let S_val = 0;
    for (let j = 0; j < wmaPeriod; j++) {
        S_val += validSumRoc[j];
    }

    for (let i = wmaPeriod; i < validSumRoc.length; i++) {
        num = num + wmaPeriod * validSumRoc[i] - S_val;
        wma.push(den > 0 ? num / den : null);

        S_val = S_val - validSumRoc[i - wmaPeriod] + validSumRoc[i];
    }
    
    return [...Array(data.length - wma.length).fill(null), ...wma];
};

export const calculateElderRay = (data: HistoricalData[], period: number): { bullPower: (number | null)[], bearPower: (number | null)[] } => {
    const closePrices = data.map(d => d.close);
    const ema = calculateEMA(closePrices, period);
    const bullPower = data.map((d, i) => ema[i] !== null ? d.high - ema[i]! : null);
    const bearPower = data.map((d, i) => ema[i] !== null ? d.low - ema[i]! : null);
    return { bullPower, bearPower };
};

export const findFVGs = (data: HistoricalData[]): { index: number, top: number, bottom: number, type: 'bullish' | 'bearish' }[] => {
  const fvgs: { index: number, top: number, bottom: number, type: 'bullish' | 'bearish' }[] = [];
  for (let i = 1; i < data.length - 1; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    const next = data[i + 1];

    if (prev.low > next.high) {
      fvgs.push({ index: i, top: prev.low, bottom: next.high, type: 'bearish' });
    }
    if (prev.high < next.low) {
      fvgs.push({ index: i, top: next.low, bottom: prev.high, type: 'bullish' });
    }
  }
  return fvgs;
}

export const calculateMFI = (data: HistoricalData[], period: number): (number | null)[] => {
    if (data.length < period + 1) return Array(data.length).fill(null);

    const mfi: (number | null)[] = Array(period).fill(null);
    let posFlow = 0;
    let negFlow = 0;

    // Helper to calculate typical price without allocating intermediate arrays
    const getTP = (d: HistoricalData) => (d.high + d.low + d.close) / 3;

    for (let i = 1; i <= period; i++) {
        const tpCurr = getTP(data[i]);
        const tpPrev = getTP(data[i - 1]);
        const mf = tpCurr * data[i].volume;

        if (tpCurr > tpPrev) posFlow += mf;
        else if (tpCurr < tpPrev) negFlow += mf;
    }

    const calcMfiValue = (pos: number, neg: number) => {
        if (neg === 0 && pos === 0) return 50;
        if (neg === 0) return 100;
        const ratio = pos / neg;
        return 100 - (100 / (1 + ratio));
    };

    mfi.push(calcMfiValue(posFlow, negFlow));

    // Sliding window loop: calculate flow changes on demand to eliminate O(N) array allocation overhead
    for (let i = period + 1; i < data.length; i++) {
        const outIdx = i - period;

        const tpOut = getTP(data[outIdx]);
        const tpOutPrev = getTP(data[outIdx - 1]);
        const mfOut = tpOut * data[outIdx].volume;

        if (tpOut > tpOutPrev) posFlow -= mfOut;
        else if (tpOut < tpOutPrev) negFlow -= mfOut;

        const tpIn = getTP(data[i]);
        const tpInPrev = getTP(data[i - 1]);
        const mfIn = tpIn * data[i].volume;

        if (tpIn > tpInPrev) posFlow += mfIn;
        else if (tpIn < tpInPrev) negFlow += mfIn;

        mfi.push(calcMfiValue(posFlow, negFlow));
    }
    return mfi;
};

export const calculateSMI = (
    data: (number|null)[], 
    smiPeriod: number, 
    emaPeriod: number
): { smi: (number | null)[], signal: (number | null)[] } => {
    const validData = data.filter((d): d is number => d !== null);
    if (validData.length < smiPeriod) return { smi: Array(data.length).fill(null), signal: Array(data.length).fill(null) };
    
    const padding = data.length - validData.length;

    const highs = calculateSlidingWindowExtreme(validData, smiPeriod, 'max');
    const lows = calculateSlidingWindowExtreme(validData, smiPeriod, 'min');

    let smiValues: (number|null)[] = [];
    for (let i = 0; i < validData.length; i++) {
        const highest = highs[i];
        const lowest = lows[i];

        if (highest === null || lowest === null) {
            continue;
        }

        const range = highest - lowest;
        const smi = range > 0 ? ((validData[i] - (highest + lowest) / 2) / (range / 2)) * 100 : 0;
        smiValues.push(smi);
    }
    
    const validSmiValues = smiValues.filter((v): v is number => v !== null);
    const smiPadding = smiValues.length - validSmiValues.length;

    const emaOfSmi = calculateEMA(validSmiValues, emaPeriod);
    const emaOfEma = calculateEMA(emaOfSmi.filter((v): v is number => v !== null), emaPeriod);

    const finalSmi = [...Array(padding + smiPadding).fill(null), ...emaOfEma];
    const signalLine = calculateSMA(finalSmi.filter((v): v is number => v !== null), 4);
    
    return {
        smi: finalSmi,
        signal: [...Array(finalSmi.length - signalLine.length).fill(null), ...signalLine]
    };
};
export const calculateSemafor = (data: HistoricalData[], period1: number = 5, period2: number = 13, period3: number = 34) => {
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);

    const high1 = calculateSlidingWindowExtreme(highs, period1, 'max');
    const low1 = calculateSlidingWindowExtreme(lows, period1, 'min');
    
    const high2 = calculateSlidingWindowExtreme(highs, period2, 'max');
    const low2 = calculateSlidingWindowExtreme(lows, period2, 'min');
    
    const high3 = calculateSlidingWindowExtreme(highs, period3, 'max');
    const low3 = calculateSlidingWindowExtreme(lows, period3, 'min');

    const result = [];
    for (let i = 0; i < data.length; i++) {
        result.push({
            level1Top: high1[i] !== null && data[i].high === high1[i],
            level1Bottom: low1[i] !== null && data[i].low === low1[i],
            level2Top: high2[i] !== null && data[i].high === high2[i],
            level2Bottom: low2[i] !== null && data[i].low === low2[i],
            level3Top: high3[i] !== null && data[i].high === high3[i],
            level3Bottom: low3[i] !== null && data[i].low === low3[i],
        });
    }
    return result;
};
