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
        return false;
    }
    const currentHigh = data[index].high;

    for (let i = 1; i <= lookaround; i++) {
        if (data[index - i].high > currentHigh || data[index + i].high > currentHigh) {
            return false;
        }
    }
    return true;
}

function isConfirmedSwingLow(data: HistoricalData[], index: number, lookaround: number, debug = false): boolean {
    if (index < lookaround || index >= data.length - lookaround) {
        return false;
    }
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

    if (!data || !Array.isArray(data)) {
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

    for (let i = peakLookaround + swingLookaround; i < data.length; i++) {

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
            if (reverse) {
                dataWithIndicators[i].sellSignal = fib50Long;
            } else {
                dataWithIndicators[i].buySignal = fib50Long;
            }
            dataWithIndicators[i].stopLossLevel = peakLow * 0.999;
            dataWithIndicators[i].peakPrice = peakLow;
        }
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
