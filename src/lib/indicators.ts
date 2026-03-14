'use client';

import type { HistoricalData } from './types';

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
  
  let currentSum = 0;
  for (let i = 0; i < period; i++) {
    currentSum += data[i];
  }
  sma[period - 1] = currentSum / period;

  for (let i = period; i < data.length; i++) {
    currentSum += data[i] - data[i - period];
    sma[i] = currentSum / period;
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
  const rsi: (number | null)[] = Array(period).fill(null);
  if (data.length <= period) return Array(data.length).fill(null);

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }

  avgGain /= period;
  avgLoss /= period;

  const firstRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(100 - (100 / (1 + firstRs)));

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
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

    let sum = 0;
    let sumSq = 0;

    for (let i = 0; i < period; i++) {
        sum += data[i];
        sumSq += data[i] * data[i];
    }

    let mean = sum / period;
    let variance = Math.max(0, (sumSq / period) - (mean * mean));
    stdDev[period - 1] = Math.sqrt(variance);

    for (let i = period; i < data.length; i++) {
        const oldVal = data[i - period];
        const newVal = data[i];

        sum += newVal - oldVal;
        sumSq += (newVal * newVal) - (oldVal * oldVal);

        mean = sum / period;
        variance = Math.max(0, (sumSq / period) - (mean * mean));
        stdDev[i] = Math.sqrt(variance);
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
    let finalUpperBand: number | null = null;
    let finalLowerBand: number | null = null;

    for (let i = 0; i < data.length; i++) {
        if (atrValues[i] === null) {
            supertrend.push(null);
            direction.push(null);
            continue;
        }

        const atr = atrValues[i]!;
        const basicUpperBand = (data[i].high + data[i].low) / 2 + multiplier * atr;
        const basicLowerBand = (data[i].high + data[i].low) / 2 - multiplier * atr;

        if (i === 0 || finalUpperBand === null || finalLowerBand === null) {
            finalUpperBand = basicUpperBand;
            finalLowerBand = basicLowerBand;
        } else {
            finalUpperBand = (basicUpperBand < finalUpperBand || data[i - 1].close > finalUpperBand) ? basicUpperBand : finalUpperBand;
            finalLowerBand = (basicLowerBand > finalLowerBand || data[i - 1].close < finalLowerBand) ? basicLowerBand : finalLowerBand;
        }

        if (supertrend.length > 0 && supertrend[i - 1] !== null) {
            const prevSupertrend = supertrend[i - 1]!;
            if (prevSupertrend === finalUpperBand && data[i].close <= finalUpperBand) {
                trendDirection = -1;
            } else if (prevSupertrend === finalUpperBand && data[i].close > finalUpperBand) {
                trendDirection = 1;
            } else if (prevSupertrend === finalLowerBand && data[i].close >= finalLowerBand) {
                trendDirection = 1;
            } else if (prevSupertrend === finalLowerBand && data[i].close < finalLowerBand) {
                trendDirection = -1;
            }
        }

        const currentSupertrend = trendDirection === 1 ? finalLowerBand : finalUpperBand;
        supertrend.push(currentSupertrend);
        direction.push(trendDirection);
    }
    return { supertrend, direction };
};

export const calculateDonchianChannels = (data: HistoricalData[], period: number): { upper: (number | null)[], middle: (number | null)[], lower: (number | null)[] } => {
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const middle: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
      middle.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const upperBand = Math.max(...slice.map(d => d.high));
      const lowerBand = Math.min(...slice.map(d => d.low));
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
    if (i >= tenkanPeriod - 1) {
      const slice = data.slice(i - tenkanPeriod + 1, i + 1);
      const highestHigh = Math.max(...slice.map(d => d.high));
      const lowestLow = Math.min(...slice.map(d => d.low));
      result.tenkan[i] = (highestHigh + lowestLow) / 2;
    }

    if (i >= kijunPeriod - 1) {
      const slice = data.slice(i - kijunPeriod + 1, i + 1);
      const highestHigh = Math.max(...slice.map(d => d.high));
      const lowestLow = Math.min(...slice.map(d => d.low));
      result.kijun[i] = (highestHigh + lowestLow) / 2;
    }
  }

  for (let i = 0; i < data.length; i++) {
    if (result.tenkan[i] !== null && result.kijun[i] !== null) {
      const val = (result.tenkan[i]! + result.kijun[i]!) / 2;
      if (i + displacement < data.length) {
        result.senkouA[i + displacement] = val;
      }
    }

    if (i >= senkouBPeriod - 1) {
      const slice = data.slice(i - senkouBPeriod + 1, i + 1);
      const highestHigh = Math.max(...slice.map(d => d.high));
      const lowestLow = Math.min(...slice.map(d => d.low));
      const val = (highestHigh + lowestLow) / 2;
      if (i + displacement < data.length) {
        result.senkouB[i + displacement] = val;
      }
    }

    if (i - displacement >= 0) {
       result.chikou[i-displacement] = data[i].close;
    }
  }

  return result;
};

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
        stochK.push(isNaN(k) ? 50 : k);
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
        if (i < period - 1 || smaTp[i] === null) {
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
    const pp: (number | null)[] = [];
    const s1: (number | null)[] = [];
    const s2: (number | null)[] = [];
    const s3: (number | null)[] = [];
    const r1: (number | null)[] = [];
    const r2: (number | null)[] = [];
    const r3: (number | null)[] = [];

    for (let i = 0; i < data.length; i++) {
        if (i < period) {
            pp.push(null);
            s1.push(null);
            s2.push(null);
            s3.push(null);
            r1.push(null);
            r2.push(null);
            r3.push(null);
        } else {
            const slice = data.slice(i - period, i);
            if (slice.length === 0 || !slice[slice.length - 1]) {
                 pp.push(null);
                 s1.push(null);
                 s2.push(null);
                 s3.push(null);
                 r1.push(null);
                 r2.push(null);
                 r3.push(null);
                 continue;
            }

            const high = Math.max(...slice.map(d => d.high));
            const low = Math.min(...slice.map(d => d.low));
            const close = slice[slice.length - 1].close;

            const ppVal = (high + low + close) / 3;
            const r1Val = (2 * ppVal) - low;
            const s1Val = (2 * ppVal) - high;
            const r2Val = ppVal + (high - low);
            const s2Val = ppVal - (high - low);
            const r3Val = high + 2 * (ppVal - low);
            const s3Val = low - 2 * (high - ppVal);

            pp.push(ppVal);
            r1.push(r1Val);
            s1.push(s1Val);
            r2.push(r2Val);
            s2.push(s2Val);
            r3.push(r3Val);
            s3.push(s3Val);
        }
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
    const roc1 = calculateMomentum(data.map(p => (p / data[0] - 1) * 100), longRoC);
    const roc2 = calculateMomentum(data.map(p => (p / data[0] - 1) * 100), shortRoC);
    
    const sumRoc = roc1.map((val, i) => val !== null && roc2[i] !== null ? val + roc2[i]! : null);
    
    const validSumRoc = sumRoc.filter((v): v is number => v !== null);
    const padding = sumRoc.length - validSumRoc.length;

    const wma: (number | null)[] = [];
    if (validSumRoc.length >= wmaPeriod) {
        let num = 0;
        let den = 0;
        for (let j = 0; j < wmaPeriod; j++) {
            num += validSumRoc[j] * (j + 1);
            den += (j + 1);
        }
        wma.push(den > 0 ? num / den : null);

        for (let i = wmaPeriod; i < validSumRoc.length; i++) {
            num = 0;
            for (let j = 0; j < wmaPeriod; j++) {
                num += validSumRoc[i - wmaPeriod + 1 + j] * (j + 1);
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

    const typicalPrices = data.map(d => (d.high + d.low + d.close) / 3);
    const rawMoneyFlows = data.map((d, i) => typicalPrices[i] * d.volume);

    for (let i = 1; i <= period; i++) {
        if (typicalPrices[i] > typicalPrices[i - 1]) posFlow += rawMoneyFlows[i];
        else if (typicalPrices[i] < typicalPrices[i - 1]) negFlow += rawMoneyFlows[i];
    }

    const calcMfiValue = (pos: number, neg: number) => {
        const ratio = neg === 0 ? (pos === 0 ? 50 : Infinity) : pos / neg;
        return 100 - (100 / (1 + ratio));
    };

    mfi.push(calcMfiValue(posFlow, negFlow));

    for (let i = period + 1; i < data.length; i++) {
        const outIdx = i - period;
        if (typicalPrices[outIdx] > typicalPrices[outIdx - 1]) posFlow -= rawMoneyFlows[outIdx];
        else if (typicalPrices[outIdx] < typicalPrices[outIdx - 1]) negFlow -= rawMoneyFlows[outIdx];

        if (typicalPrices[i] > typicalPrices[i - 1]) posFlow += rawMoneyFlows[i];
        else if (typicalPrices[i] < typicalPrices[i - 1]) negFlow += rawMoneyFlows[i];

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

    let smiValues: (number|null)[] = [];
    for (let i = smiPeriod - 1; i < validData.length; i++) {
        const slice = validData.slice(i - smiPeriod + 1, i + 1);
        const highest = Math.max(...slice);
        const lowest = Math.min(...slice);
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
