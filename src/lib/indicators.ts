

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
    if (data.length < period) return Array(data.length).fill(null);

    const trValues: number[] = [data[0].high - data[0].low]; // True Range values
    for (let i = 1; i < data.length; i++) {
        const high = data[i].high;
        const low = data[i].low;
        const prevClose = data[i - 1].close;
        trValues.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
    }

    const atr: (number | null)[] = [];
    let currentAtr: number | null = null;

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            atr.push(null);
        } else if (i === period - 1) {
            // First ATR is the average of the first 'period' TRs
            const initialTrSum = trValues.slice(0, period).reduce((acc, val) => acc + val, 0);
            currentAtr = initialTrSum / period;
            atr.push(currentAtr);
        } else {
            // Smoothed ATR for subsequent values
            currentAtr = (currentAtr! * (period - 1) + trValues[i]) / period;
            atr.push(currentAtr);
        }
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

// New indicators
export const calculateStochastic = (data: HistoricalData[], period: number, smoothK: number, smoothD: number): { k: (number | null)[], d: (number | null)[] } => {
    const stochK: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            stochK.push(null);
            continue;
        }
        const slice = data.slice(i - period + 1, i + 1);
        const lowestLow = Math.min(...slice.map(d => d.low));
        const highestHigh = Math.max(...slice.map(d => d.high));
        const k = ((data[i].close - lowestLow) / (highestHigh - lowestLow)) * 100;
        stochK.push(isNaN(k) ? 50 : k); // Handle division by zero
    }
    const smoothedK = calculateSMA(stochK.filter(v => v !== null) as number[], smoothK);
    const kWithPadding = [...Array(data.length - smoothedK.length).fill(null), ...smoothedK];
    const smoothedD = calculateSMA(smoothedK.filter(v => v !== null) as number[], smoothD);
    const dWithPadding = [...Array(data.length - smoothedD.length).fill(null), ...smoothedD];
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
    const vwap: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            vwap.push(null);
            continue;
        }
        const slice = data.slice(i - period + 1, i + 1);
        const totalPV = slice.reduce((sum, d) => sum + ((d.high + d.low + d.close) / 3) * d.volume, 0);
        const totalVolume = slice.reduce((sum, d) => sum + d.volume, 0);
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
    psar.push(sar); // last value
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
    const medianPrices = data.map(d => (d.high + d.low) / 2);
    const smaShort = calculateSMA(medianPrices, shortPeriod);
    const smaLong = calculateSMA(medianPrices, longPeriod);
    return smaShort.map((val, i) => val !== null && smaLong[i] !== null ? val - smaLong[i]! : null);
};

export const calculateWilliamsR = (data: HistoricalData[], period: number): (number | null)[] => {
    const williamsR: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            williamsR.push(null);
            continue;
        }
        const slice = data.slice(i - period + 1, i + 1);
        const highestHigh = Math.max(...slice.map(d => d.high));
        const lowestLow = Math.min(...slice.map(d => d.low));
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
        if (i < period - 1) {
            cci.push(null);
            continue;
        }
        const slice = typicalPrices.slice(i - period + 1, i + 1);
        const meanDeviation = slice.reduce((sum, val) => sum + Math.abs(val - smaTp[i]!), 0) / period;
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

export const calculatePivotPoints = (data: HistoricalData[], period: number): { pp: (number|null)[], s1: (number|null)[], s2: (number|null)[], s3: (number|null)[], r1: (number|null)[], r2: (number|null)[], r3: (number|null)[] } => {
    const result = { pp: [], s1: [], s2: [], s3: [], r1: [], r2: [], r3: [] } as Record<string, (number|null)[]>;
    for (let i = 0; i < data.length; i++) {
        if (i < period) {
            Object.keys(result).forEach(k => result[k].push(null));
        } else {
            const slice = data.slice(i - period, i); // Use previous period's data
            const high = Math.max(...slice.map(d => d.high));
            const low = Math.min(...slice.map(d => d.low));
            const close = slice[slice.length - 1].close;

            const pp = (high + low + close) / 3;
            const r1 = (2 * pp) - low;
            const s1 = (2 * pp) - high;
            const r2 = pp + (high - low);
            const s2 = pp - (high - low);
            const r3 = high + 2 * (pp - low);
            const s3 = low - 2 * (high - pp);

            result.pp.push(pp);
            result.r1.push(r1);
            result.s1.push(s1);
            result.r2.push(r2);
            result.s2.push(s2);
            result.r3.push(r3);
            result.s3.push(s3);
        }
    }
    return result;
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
    const cmf: (number | null)[] = [];
    const moneyFlowVolumes: number[] = [];
    const volumes: number[] = [];

    for (let i = 0; i < data.length; i++) {
        const d = data[i];
        const range = d.high - d.low;
        const multiplier = range > 0 ? ((d.close - d.low) - (d.high - d.close)) / range : 0;
        const mfv = multiplier * d.volume;
        
        moneyFlowVolumes.push(mfv);
        volumes.push(d.volume);

        if (i < period - 1) {
            cmf.push(null);
        } else {
            const sumMfv = moneyFlowVolumes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            const sumVol = volumes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            cmf.push(sumVol > 0 ? sumMfv / sumVol : null);
        }
    }
    return cmf;
};

export const calculateCoppockCurve = (data: number[], longRoC: number, shortRoC: number, wmaPeriod: number): (number | null)[] => {
    const roc1 = calculateMomentum(data.map(p => (p / data[0] - 1) * 100), longRoC);
    const roc2 = calculateMomentum(data.map(p => (p / data[0] - 1) * 100), shortRoC);
    
    const sumRoc = roc1.map((val, i) => val !== null && roc2[i] !== null ? val + roc2[i]! : null);
    
    const validSumRoc = sumRoc.filter((v): v is number => v !== null);
    const padding = sumRoc.length - validSumRoc.length;

    const wma: (number | null)[] = [];
    if (validSumRoc.length >= wmaPeriod) {
        for (let i = wmaPeriod - 1; i < validSumRoc.length; i++) {
            const slice = validSumRoc.slice(i - wmaPeriod + 1, i + 1);
            let num = 0, den = 0;
            for (let j = 0; j < slice.length; j++) {
                num += slice[j] * (j + 1);
                den += (j + 1);
            }
            wma.push(den > 0 ? num / den : null);
        }
    }
    
    return [...Array(padding + wmaPeriod - 1).fill(null), ...wma];
};

export const calculateElderRay = (data: HistoricalData[], period: number): { bullPower: (number | null)[], bearPower: (number | null)[] } => {
    const closePrices = data.map(d => d.close);
    const ema = calculateEMA(closePrices, period);
    const bullPower = data.map((d, i) => ema[i] !== null ? d.high - ema[i]! : null);
    const bearPower = data.map((d, i) => ema[i] !== null ? d.low - ema[i]! : null);
    return { bullPower, bearPower };
};

export const findFVGs = (data: HistoricalData[]): { index: number, top: number, bottom: number, type: 'bullish' | 'bearish' }[] => {
  const fvgs = [];
  for (let i = 1; i < data.length - 1; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    const next = data[i + 1];

    // Bearish FVG (gap between low of prev and high of next)
    if (prev.low > next.high) {
      fvgs.push({ index: i, top: prev.low, bottom: next.high, type: 'bearish' });
    }
    // Bullish FVG (gap between high of prev and low of next)
    if (prev.high < next.low) {
      fvgs.push({ index: i, top: next.low, bottom: prev.high, type: 'bullish' });
    }
  }
  return fvgs;
}
