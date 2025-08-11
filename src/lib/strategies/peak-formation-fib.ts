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
    if (index < lookaround || index >= data.length - lookaround) {
        if (debug) console.log("[DEBUG] Index out of bounds for lookaround:", { index, lookaround, dataLength: data.length });
        return false;
    }
    const currentHigh = data[index].high;
    if (debug) console.log("[DEBUG] Checking swing high at index:", index, "with currentHigh:", currentHigh);

    for (let i = 1; i <= lookaround; i++) {
        if (data[index - i].high > currentHigh || data[index + i].high > currentHigh) {
            if (debug) console.log("[DEBUG] Found a higher high around index:", index, "at offset:", i);
            return false;
        }
    }
    if (debug) console.log("[DEBUG] Confirmed swing high at index:", index);
    return true;
}

function isConfirmedSwingLow(data: HistoricalData[], index: number, lookaround: number, debug = false): boolean {
    if (index < lookaround || index >= data.length - lookaround) {
        if (debug) console.log("[DEBUG] Index out of bounds for lookaround (low):", { index, lookaround, dataLength: data.length });
        return false;
    }
    const currentLow = data[index].low;
    for (let i = 1; i <= lookaround; i++) {
        if (data[index - i].low < currentLow || data[index + i].low < currentLow) {
            if (debug) console.log("[DEBUG] Found a lower low around index:", index, "at offset:", i);
            return false;
        }
    }
    if (debug) console.log("[DEBUG] Confirmed swing low at index:", index);
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

    if (!data || !Array.isArray(data)) {
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

    if (data.length < emaLongPeriod) {
        if (debug) console.log("[DEBUG] Not enough data:", data.length, "<", emaLongPeriod);
        return data;
    }

    const closePrices = data.map(d => d.close);
    const emaShort = calculateEMA(closePrices, emaShortPeriod);
    const emaLong = calculateEMA(closePrices, emaLongPeriod);

    // Clone data to avoid mutating original
    const dataWithIndicators: HistoricalData[] = data.map((d, i) => ({
        ...d,
        ema_short: emaShort[i],
        ema_long: emaLong[i],
    }));

    let anySignal = false;

    for (let i = peakLookaround + swingLookaround; i < data.length; i++) {
        if (debug && i % 10 === 0)
            console.log(`[DEBUG] Candle ${i}: price=${data[i].close}`);

        // --- NON-REPAINTING SHORT SETUP ---
        let pfhIndex = -1;
        for (let j = i - peakLookaround; j > peakLookaround; j--) {
            if (isConfirmedSwingHigh(data, j, peakLookaround, debug)) {
                pfhIndex = j;
                break;
            }
        }
        if (pfhIndex === -1) continue;

        const peakHigh = data[pfhIndex].high;

        let swingLowIndex = -1;
        for (let j = pfhIndex - 1; j > swingLookaround; j--) {
            if (isConfirmedSwingLow(data, j, swingLookaround, debug)) {
                swingLowIndex = j;
                break;
            }
        }
        if (swingLowIndex === -1) continue;

        const breakLevel = data[swingLowIndex].low;

        let bosIndex = -1;
        for (let k = pfhIndex + 1; k < i; k++) {
            if (data[k].close < breakLevel) {
                bosIndex = k;
                break;
            }
        }
        if (bosIndex === -1) continue;

        if (!emaShort[bosIndex] || !emaLong[bosIndex] || emaShort[bosIndex]! >= emaLong[bosIndex]!) continue;

        // Find lowest low since BOS
        let lowSinceBos = data[bosIndex].low;
        for (let k = bosIndex; k <= i; k++) {
            if (data[k].low < lowSinceBos) lowSinceBos = data[k].low;
        }
        const fibRange = peakHigh - lowSinceBos;
        const fib50 = lowSinceBos + fibRange * fibLevel1;

        if (i <= bosIndex + signalStaleness && data[i].high >= fib50 && data[i - 1].high < fib50) {
            if (debug) console.log(`[DEBUG] SHORT SIGNAL at candle ${i}: fib50=${fib50}, high=${data[i].high}`);
            anySignal = true;
            if (reverse) {
                dataWithIndicators[i].buySignal = fib50;
            } else {
                dataWithIndicators[i].sellSignal = fib50;
            }
            dataWithIndicators[i].stopLossLevel = peakHigh * 1.001;
            dataWithIndicators[i].peakPrice = peakHigh;
        }

        // --- NON-REPAINTING LONG SETUP ---
        let pflIndex = -1;
        for (let j = i - peakLookaround; j > peakLookaround; j--) {
            if (isConfirmedSwingLow(data, j, peakLookaround, debug)) {
                pflIndex = j;
                break;
            }
        }
        if (pflIndex === -1) continue;

        const peakLow = data[pflIndex].low;

        let swingHighIndex = -1;
        for (let j = pflIndex - 1; j > swingLookaround; j--) {
            if (isConfirmedSwingHigh(data, j, swingLookaround, debug)) {
                swingHighIndex = j;
                break;
            }
        }
        if (swingHighIndex === -1) continue;

        const breakLevelLong = data[swingHighIndex].high;

        let bosIndexLong = -1;
        for (let k = pflIndex + 1; k < i; k++) {
            if (data[k].close > breakLevelLong) {
                bosIndexLong = k;
                break;
            }
        }
        if (bosIndexLong === -1) continue;

        if (!emaShort[bosIndexLong] || !emaLong[bosIndexLong] || emaShort[bosIndexLong]! <= emaLong[bosIndexLong]!) continue;

        // Find highest high since BOS
        let highSinceBos = data[bosIndexLong].high;
        for (let k = bosIndexLong; k <= i; k++) {
            if (data[k].high > highSinceBos) highSinceBos = data[k].high;
        }
        const fibRangeLong = highSinceBos - peakLow;
        const fib50Long = highSinceBos - fibRangeLong * fibLevel1;

        if (i <= bosIndexLong + signalStaleness && data[i].low <= fib50Long && data[i - 1].low > fib50Long) {
            if (debug) console.log(`[DEBUG] LONG SIGNAL at candle ${i}: fib50Long=${fib50Long}, low=${data[i].low}`);
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
