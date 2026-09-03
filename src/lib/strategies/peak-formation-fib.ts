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
    signalStaleness: number;
    reverse?: boolean;
    discipline: DisciplineParams;
    debug?: boolean;
}
export const defaultPffParams: PffParams = {
    peakLookaround: 5,
    swingLookaround: 3,
    emaShortPeriod: 13,
    emaLongPeriod: 50,
    fibLevel1: 0.5,
    fibLevel2: 0.618,
    signalStaleness: 25,
    reverse: false,
    discipline: {
        enableDiscipline: true,
        maxConsecutiveLosses: 4,
        cooldownPeriodMinutes: 15,
        dailyDrawdownLimit: 10,
        onFailure: 'Cooldown',
    },
    debug: false,
}

function isConfirmedSwingHigh(data: HistoricalData[], index: number, lookaround: number, debug = false): boolean {
    if (index < lookaround || index >= data.length - lookaround) return false;
    const currentHigh = data[index].high;

    for (let i = 1; i <= lookaround; i++) {
        if (data[index - i].high > currentHigh || data[index + i].high > currentHigh) {
            return false;
        }
    }
    return true;
}

function isConfirmedSwingLow(data: HistoricalData[], index: number, lookaround: number, debug = false): boolean {
    if (index < lookaround || index >= data.length - lookaround) return false;
    const currentLow = data[index].low;
    for (let i = 1; i <= lookaround; i++) {
        if (data[index - i].low < currentLow || data[index + i].low < currentLow) {
            return false;
        }
    }
    return true;
}

async function calculate(
    data: HistoricalData[],
    params: PffParams = defaultPffParams
): Promise<HistoricalData[]> {
    const debug = params?.debug ?? false;
    if (debug) {
        console.log("[DEBUG] peakFormationFibStrategy.calculate called", { dataLength: data?.length, params });
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
        if (debug) console.log("[DEBUG] Data is missing or not an array!", data);
        return [];
    }

    const {
        peakLookaround,
        swingLookaround,
        emaShortPeriod,
        emaLongPeriod,
        fibLevel1,
        fibLevel2,
        signalStaleness,
        reverse,
    } = params;

    if (data.length < Math.max(emaLongPeriod, peakLookaround + swingLookaround)) {
        if (debug) console.log("[DEBUG] Not enough data");
        return data.map(d => ({...d}));
    }

    const closePrices = data.map(d => d.close);
    const emaShort = calculateEMA(closePrices, emaShortPeriod);
    const emaLong = calculateEMA(closePrices, emaLongPeriod);

    // Precompute swing highs and lows in O(N) instead of scanning backwards O(N*lookaround)
    const isPfHigh = new Uint8Array(data.length);
    const isPfLow = new Uint8Array(data.length);
    const isSwingHigh = new Uint8Array(data.length);
    const isSwingLow = new Uint8Array(data.length);

    for (let i = peakLookaround; i < data.length - peakLookaround; i++) {
        if (isConfirmedSwingHigh(data, i, peakLookaround, debug)) isPfHigh[i] = 1;
        if (isConfirmedSwingLow(data, i, peakLookaround, debug)) isPfLow[i] = 1;
    }
    for (let i = swingLookaround; i < data.length - swingLookaround; i++) {
        if (isConfirmedSwingHigh(data, i, swingLookaround, debug)) isSwingHigh[i] = 1;
        if (isConfirmedSwingLow(data, i, swingLookaround, debug)) isSwingLow[i] = 1;
    }

    const dataWithIndicators: HistoricalData[] = data.map((d, i) => ({
        ...d,
        ema_short: emaShort[i],
        ema_long: emaLong[i],
    }));

    let anySignal = false;

    // Track running state across candles to avoid O(N^2) backward/forward searches
    let currentPfhIndex = -1;
    let currentSwingLowIndex = -1;
    let currentShortBosIndex = -1;
    let currentLowSinceBos = Infinity;

    let currentPflIndex = -1;
    let currentSwingHighIndex = -1;
    let currentLongBosIndex = -1;
    let currentHighSinceBos = -Infinity;

    for (let i = peakLookaround + swingLookaround; i < data.length; i++) {
        const candidatePeakIdx = i - peakLookaround;

        // --- NON-REPAINTING SHORT SETUP ---
        // Ensure candidatePeakIdx > peakLookaround to match exact boundary condition j > peakLookaround
        if (candidatePeakIdx > peakLookaround && isPfHigh[candidatePeakIdx]) {
            currentPfhIndex = candidatePeakIdx;
            currentSwingLowIndex = -1;
            for (let j = currentPfhIndex - 1; j > swingLookaround; j--) {
                if (isSwingLow[j]) {
                    currentSwingLowIndex = j;
                    break;
                }
            }
            currentShortBosIndex = -1;
            currentLowSinceBos = Infinity;
        }

        if (currentPfhIndex !== -1 && currentSwingLowIndex !== -1) {
            const breakLevel = data[currentSwingLowIndex].low;

            if (currentShortBosIndex === -1) {
                for (let k = currentPfhIndex + 1; k < i; k++) {
                    if (data[k].close < breakLevel) {
                        currentShortBosIndex = k;
                        break;
                    }
                }
                if (currentShortBosIndex !== -1) {
                    currentLowSinceBos = data[currentShortBosIndex].low;
                    for (let k = currentShortBosIndex + 1; k <= i; k++) {
                        if (data[k].low < currentLowSinceBos) {
                            currentLowSinceBos = data[k].low;
                        }
                    }
                }
            } else {
                if (data[i].low < currentLowSinceBos) {
                    currentLowSinceBos = data[i].low;
                }
            }

            if (currentShortBosIndex !== -1 && emaShort[currentShortBosIndex] !== null && emaLong[currentShortBosIndex] !== null && emaShort[currentShortBosIndex]! < emaLong[currentShortBosIndex]!) {
                const peakHigh = data[currentPfhIndex].high;
                const fibRange = peakHigh - currentLowSinceBos;
                const fib50 = currentLowSinceBos + fibRange * fibLevel1;

                if (i <= currentShortBosIndex + signalStaleness && data[i].high >= fib50 && data[i - 1].high < fib50) {
                    anySignal = true;
                    if (reverse) {
                        dataWithIndicators[i].buySignal = fib50;
                    } else {
                        dataWithIndicators[i].sellSignal = fib50;
                    }
                    dataWithIndicators[i].stopLossLevel = peakHigh * 1.001;
                    dataWithIndicators[i].peakPrice = peakHigh;
                }
            }
        }

        // --- NON-REPAINTING LONG SETUP ---
        if (candidatePeakIdx > peakLookaround && isPfLow[candidatePeakIdx]) {
            currentPflIndex = candidatePeakIdx;
            currentSwingHighIndex = -1;
            for (let j = currentPflIndex - 1; j > swingLookaround; j--) {
                if (isSwingHigh[j]) {
                    currentSwingHighIndex = j;
                    break;
                }
            }
            currentLongBosIndex = -1;
            currentHighSinceBos = -Infinity;
        }

        if (currentPflIndex !== -1 && currentSwingHighIndex !== -1) {
            const breakLevelLong = data[currentSwingHighIndex].high;

            if (currentLongBosIndex === -1) {
                for (let k = currentPflIndex + 1; k < i; k++) {
                    if (data[k].close > breakLevelLong) {
                        currentLongBosIndex = k;
                        break;
                    }
                }
                if (currentLongBosIndex !== -1) {
                    currentHighSinceBos = data[currentLongBosIndex].high;
                    for (let k = currentLongBosIndex + 1; k <= i; k++) {
                        if (data[k].high > currentHighSinceBos) {
                            currentHighSinceBos = data[k].high;
                        }
                    }
                }
            } else {
                if (data[i].high > currentHighSinceBos) {
                    currentHighSinceBos = data[i].high;
                }
            }

            if (currentLongBosIndex !== -1 && emaShort[currentLongBosIndex] !== null && emaLong[currentLongBosIndex] !== null && emaShort[currentLongBosIndex]! > emaLong[currentLongBosIndex]!) {
                const peakLow = data[currentPflIndex].low;
                const fibRangeLong = currentHighSinceBos - peakLow;
                const fib50Long = currentHighSinceBos - fibRangeLong * fibLevel1;

                if (i <= currentLongBosIndex + signalStaleness && data[i].low <= fib50Long && data[i - 1].low > fib50Long) {
                    anySignal = true;
                    if (reverse) {
                        dataWithIndicators[i].sellSignal = fib50Long;
                    } else {
                        dataWithIndicators[i].buySignal = fib50Long;
                    }
                    dataWithIndicators[i].stopLossLevel = peakLow * 0.999;
                    dataWithIndicators[i].peakPrice = peakLow;
                }
            }
        }
    }

    if (!anySignal && debug) {
        console.log("[DEBUG] No signals generated in this run.");
    }

    return dataWithIndicators;
}

const peakFormationFibStrategy: Strategy = {
    id: 'peak-formation-fib',
    name: 'Peak Formation Fib',
    description: 'A strategy based on identifying market peaks and using Fibonacci retracements to find entries.',
    calculate,
};

export default peakFormationFibStrategy;
