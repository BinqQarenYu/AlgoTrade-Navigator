'use client';

import type { HistoricalData, Strategy, DisciplineParams } from '../types';
import { calculateEMA } from '../indicators';

export interface PffParams {
    peakLookaround: number;
    swingLookaround: number;
    emaShortPeriod: number;
    emaLongPeriod: number;
    fibLevel1: number;
    fibLevel2: number;
    signalStaleness: number; // How many candles a signal remains valid after a Break of Structure
    discipline: DisciplineParams;
}

export const defaultPffParams: PffParams = {
    peakLookaround: 5,
    swingLookaround: 3,
    emaShortPeriod: 13,
    emaLongPeriod: 50,
    fibLevel1: 0.5,
    fibLevel2: 0.618,
    signalStaleness: 25,
    discipline: {
        enableDiscipline: true,
        maxConsecutiveLosses: 4,
        cooldownPeriodMinutes: 15,
        dailyDrawdownLimit: 10,
        onFailure: 'Cooldown',
    },
};

// A confirmed swing high/low means 'lookaround' bars on BOTH sides have lower highs / higher lows.
// This function can only confirm swings that are in the past.
function isConfirmedSwingHigh(data: HistoricalData[], index: number, lookaround: number): boolean {
    if (index < lookaround || index >= data.length - lookaround) return false;
    const currentHigh = data[index].high;
    for (let i = 1; i <= lookaround; i++) {
        if (data[index - i].high > currentHigh || data[index + i].high > currentHigh) {
            return false;
        }
    }
    return true;
}

function isConfirmedSwingLow(data: HistoricalData[], index: number, lookaround: number): boolean {
    if (index < lookaround || index >= data.length - lookaround) return false;
    const currentLow = data[index].low;
    for (let i = 1; i <= lookaround; i++) {
        if (data[index - i].low < currentLow || data[index + i].low < currentLow) {
            return false;
        }
    }
    return true;
}


const peakFormationFibStrategy: Strategy = {
    id: 'peak-formation-fib',
    name: 'Peak Formation Fib (Non-Repainting)',
    description: 'A non-repainting strategy that identifies market peaks, waits for a break of structure, and enters on a Fibonacci retracement.',
    async calculate(data: HistoricalData[], userParams: Partial<PffParams> = {}): Promise<HistoricalData[]> {
        const params = { ...defaultPffParams, ...userParams };
        const dataWithIndicators = JSON.parse(JSON.stringify(data));
        const { peakLookaround, swingLookaround, emaShortPeriod, emaLongPeriod, fibLevel1, fibLevel2, signalStaleness } = params;

        if (data.length < emaLongPeriod) return dataWithIndicators;

        const closePrices = data.map(d => d.close);
        const emaShort = calculateEMA(closePrices, emaShortPeriod);
        const emaLong = calculateEMA(closePrices, emaLongPeriod);
        
        dataWithIndicators.forEach((d: HistoricalData, i: number) => {
            d.ema_short = emaShort[i];
            d.ema_long = emaLong[i];
        });

        // This revised logic iterates through each candle as if it's the "current" moment in time,
        // ensuring it only acts on information that has already happened.
        for (let i = peakLookaround + swingLookaround; i < data.length; i++) {
            
            // --- NON-REPAINTING SHORT SETUP ---
            let pfhIndex = -1;
            for (let j = i - peakLookaround; j > peakLookaround; j--) {
                if (isConfirmedSwingHigh(data, j, peakLookaround)) {
                    pfhIndex = j;
                    break;
                }
            }
            if (pfhIndex !== -1) {
                const peakHigh = data[pfhIndex].high;
                let swingLowIndex = -1;
                for (let j = pfhIndex - 1; j > swingLookaround; j--) {
                     if (isConfirmedSwingLow(data, j, swingLookaround)) {
                        swingLowIndex = j;
                        break;
                    }
                }
                if (swingLowIndex !== -1) {
                    const breakLevel = data[swingLowIndex].low;
                    let bosIndex = -1;
                    for (let k = pfhIndex + 1; k < i; k++) {
                        if (data[k].close < breakLevel) {
                            bosIndex = k;
                            break;
                        }
                    }
                    if (bosIndex !== -1 && emaShort[bosIndex] && emaLong[bosIndex] && emaShort[bosIndex]! < emaLong[bosIndex]!) {
                        const lowSinceBos = Math.min(...data.slice(bosIndex, i + 1).map(c => c.low));
                        const fibRange = peakHigh - lowSinceBos;
                        const fib50 = lowSinceBos + fibRange * fibLevel1;

                        if (i <= bosIndex + signalStaleness && data[i].high >= fib50 && data[i-1].high < fib50) {
                            dataWithIndicators[i].bearish_event = true;
                            dataWithIndicators[i].stopLossLevel = peakHigh * 1.001;
                            dataWithIndicators[i].peakPrice = peakHigh;
                        }
                    }
                }
            }

            // --- NON-REPAINTING LONG SETUP ---
            let pflIndex = -1;
            for (let j = i - peakLookaround; j > peakLookaround; j--) {
                if (isConfirmedSwingLow(data, j, peakLookaround)) {
                    pflIndex = j;
                    break;
                }
            }
            if (pflIndex !== -1) {
                const peakLow = data[pflIndex].low;
                let swingHighIndex = -1;
                for (let j = pflIndex - 1; j > swingLookaround; j--) {
                    if (isConfirmedSwingHigh(data, j, swingLookaround)) {
                        swingHighIndex = j;
                        break;
                    }
                }
                if (swingHighIndex !== -1) {
                    const breakLevelLong = data[swingHighIndex].high;
                    let bosIndexLong = -1;
                    for (let k = pflIndex + 1; k < i; k++) {
                        if (data[k].close > breakLevelLong) {
                            bosIndexLong = k;
                            break;
                        }
                    }
                    if (bosIndexLong !== -1 && emaShort[bosIndexLong] && emaLong[bosIndexLong] && emaShort[bosIndexLong]! > emaLong[bosIndexLong]!) {
                        const highSinceBos = Math.max(...data.slice(bosIndexLong, i + 1).map(c => c.high));
                        const fibRangeLong = highSinceBos - peakLow;
                        const fib50Long = highSinceBos - fibRangeLong * fibLevel1;
                        
                        if (i <= bosIndexLong + signalStaleness && data[i].low <= fib50Long && data[i - 1].low > fib50Long) {
                            dataWithIndicators[i].bullish_event = true;
                            dataWithIndicators[i].stopLossLevel = peakLow * 0.999;
                            dataWithIndicators[i].peakPrice = peakLow;
                        }
                    }
                }
            }
        }
        return dataWithIndicators;
    }
}

export default peakFormationFibStrategy;
