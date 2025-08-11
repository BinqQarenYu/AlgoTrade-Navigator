'use client';

import type { HistoricalData, Strategy, DisciplineParams } from '../types';
import { calculateEMA } from '../indicators';

export interface HyperPFFParams {
    peakLookaround: number;
    swingLookaround: number;
    emaShortPeriod: number;
    emaLongPeriod: number;
    fibLevel1: number;
    fibLevel2: number;
    signalStaleness: number;
    reverse?: boolean;
    debug?: boolean; // <-- Added for debugging
    discipline: DisciplineParams;
}

export const defaultHyperPFFParams: HyperPFFParams = {
    peakLookaround: 5,
    swingLookaround: 3,
    emaShortPeriod: 13,
    emaLongPeriod: 50,
    fibLevel1: 0.5,
    fibLevel2: 0.618,
    signalStaleness: 25,
    reverse: false,
    debug: true, // Default to on
    discipline: {
        enableDiscipline: true,
        maxConsecutiveLosses: 4,
        cooldownPeriodMinutes: 15,
        dailyDrawdownLimit: 10,
        onFailure: 'Cooldown',
    },
};

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

const hyperPeakFormationStrategy: Strategy = {
    id: 'hyper-peak-formation',
    name: 'Hyper Peak Formation (NEW)',
    description: 'A non-repainting strategy that identifies market peaks, waits for a break of structure, and enters on a Fibonacci retracement.',
    async calculate(data: HistoricalData[], params: HyperPFFParams = defaultHyperPFFParams): Promise<HistoricalData[]> {
        const { peakLookaround, swingLookaround, emaShortPeriod, emaLongPeriod, fibLevel1, fibLevel2, signalStaleness, reverse, debug } = params;

        if (debug) console.log(`[HPF DEBUG] Calculating Hyper Peak Formation. Data length: ${data?.length}, Params:`, params);

        if (!data || !Array.isArray(data)) {
            if (debug) console.log("[HPF DEBUG] Data is missing or not an array!", data);
            return [];
        }

        const dataWithIndicators = JSON.parse(JSON.stringify(data));

        if (data.length < emaLongPeriod) {
            if (debug) console.log(`[HPF DEBUG] Not enough data: ${data.length} < ${emaLongPeriod}`);
            return dataWithIndicators;
        }

        const closePrices = data.map(d => d.close);
        const emaShort = calculateEMA(closePrices, emaShortPeriod);
        const emaLong = calculateEMA(closePrices, emaLongPeriod);

        dataWithIndicators.forEach((d: HistoricalData, i: number) => {
            d.ema_short = emaShort[i];
            d.ema_long = emaLong[i];
            if (debug) {
                d.debug_info = {}; // Initialize debug info object
            }
        });

        let signals = 0;

        for (let i = peakLookaround + swingLookaround; i < data.length; i++) {
            const currentCandle = data[i];
            const currentDebugInfo = dataWithIndicators[i].debug_info;
            if (debug) {
                console.log(`\n[HPF DEBUG] Candle #${i} | Time: ${new Date(currentCandle.time).toLocaleString()} | O: ${currentCandle.open} H: ${currentCandle.high} L: ${currentCandle.low} C: ${currentCandle.close}`);
                currentDebugInfo.candle = `#${i}`;
            }

            // --- NON-REPAINTING SHORT SETUP ---
            let pfhIndex = -1;
            for (let j = i - peakLookaround; j > peakLookaround; j--) {
                if (isConfirmedSwingHigh(data, j, peakLookaround)) {
                    pfhIndex = j;
                    if (debug) {
                        const logMsg = `Found potential PFH at index ${j}, price: ${data[j].high}`;
                        console.log(`[HPF DEBUG Short] ${logMsg}`);
                        currentDebugInfo.short_pfh = logMsg;
                    }
                    break;
                }
            }
            if (pfhIndex === -1) continue;

            const peakHigh = data[pfhIndex].high;

            let swingLowIndex = -1;
            for (let j = pfhIndex - 1; j > swingLookaround; j--) {
                if (isConfirmedSwingLow(data, j, swingLookaround)) {
                    swingLowIndex = j;
                    if (debug) {
                        const logMsg = `Found associated Swing Low at index ${j}, price: ${data[j].low}`;
                        console.log(`[HPF DEBUG Short] ${logMsg}`);
                        currentDebugInfo.short_swingLow = logMsg;
                    }
                    break;
                }
            }
            if (swingLowIndex === -1) continue;

            const breakLevel = data[swingLowIndex].low;
            if (debug) {
                const logMsg = `Break of Structure level set to: ${breakLevel}`;
                console.log(`[HPF DEBUG Short] ${logMsg}`);
                currentDebugInfo.short_breakLevel = logMsg;
            }

            let bosIndex = -1;
            for (let k = pfhIndex + 1; k < i; k++) {
                if (data[k].close < breakLevel) {
                    bosIndex = k;
                    if (debug) {
                        const logMsg = `BOS confirmed at index ${k}, close: ${data[k].close}`;
                        console.log(`[HPF DEBUG Short] ${logMsg}`);
                        currentDebugInfo.short_bos = logMsg;
                    }
                    break;
                }
            }
            if (bosIndex === -1) continue;

            const isEmaBearish = emaShort[bosIndex]! < emaLong[bosIndex]!;
            if (debug) {
                const logMsg = `EMA check at BOS: Short EMA=${emaShort[bosIndex]}, Long EMA=${emaLong[bosIndex]}. Bearish? ${isEmaBearish}`;
                console.log(`[HPF DEBUG Short] ${logMsg}`);
                currentDebugInfo.short_emaCheck = logMsg;
            }
            if (!isEmaBearish) continue;

            const lowSinceBos = Math.min(...data.slice(bosIndex, i + 1).map(c => c.low));
            const fibRange = peakHigh - lowSinceBos;
            const fib50 = lowSinceBos + fibRange * fibLevel1;
            if (debug) {
                const logMsg = `Fib level calculated. Low since BOS: ${lowSinceBos}, Fib Range: ${fibRange}, Fib Entry: ${fib50}`;
                console.log(`[HPF DEBUG Short] ${logMsg}`);
                currentDebugInfo.short_fibCalc = logMsg;
            }


            if (currentCandle.high >= fib50 && data[i - 1].high < fib50) {
                signals++;
                if (debug) {
                    const logMsg = `SHORT SIGNAL TRIGGERED: fib50=${fib50}, high=${currentCandle.high}, price=${currentCandle.close}`;
                    console.log(`%c[HPF DEBUG] ${logMsg} at candle ${i}`, 'color: red; font-weight: bold;');
                    currentDebugInfo.short_SIGNAL = logMsg;
                }
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
                if (isConfirmedSwingLow(data, j, peakLookaround)) {
                    pflIndex = j;
                    if (debug) {
                        const logMsg = `Found potential PFL at index ${j}, price: ${data[j].low}`;
                        console.log(`[HPF DEBUG Long] ${logMsg}`);
                        currentDebugInfo.long_pfl = logMsg;
                    }
                    break;
                }
            }
            if (pflIndex === -1) continue;

            const peakLow = data[pflIndex].low;

            let swingHighIndex = -1;
            for (let j = pflIndex - 1; j > swingLookaround; j--) {
                if (isConfirmedSwingHigh(data, j, swingLookaround)) {
                    swingHighIndex = j;
                    if (debug) {
                        const logMsg = `Found associated Swing High at index ${j}, price: ${data[j].high}`;
                        console.log(`[HPF DEBUG Long] ${logMsg}`);
                        currentDebugInfo.long_swingHigh = logMsg;
                    }
                    break;
                }
            }
            if (swingHighIndex === -1) continue;

            const breakLevelLong = data[swingHighIndex].high;
            if (debug) {
                const logMsg = `Break of Structure level set to: ${breakLevelLong}`;
                console.log(`[HPF DEBUG Long] ${logMsg}`);
                currentDebugInfo.long_breakLevel = logMsg;
            }

            let bosIndexLong = -1;
            for (let k = pflIndex + 1; k < i; k++) {
                if (data[k].close > breakLevelLong) {
                    bosIndexLong = k;
                    if (debug) {
                        const logMsg = `BOS confirmed at index ${k}, close: ${data[k].close}`;
                        console.log(`[HPF DEBUG Long] ${logMsg}`);
                        currentDebugInfo.long_bos = logMsg;
                    }
                    break;
                }
            }
            if (bosIndexLong === -1) continue;

            const isEmaBullish = emaShort[bosIndexLong]! > emaLong[bosIndexLong]!;
            if (debug) {
                const logMsg = `EMA check at BOS: Short EMA=${emaShort[bosIndexLong]}, Long EMA=${emaLong[bosIndexLong]}. Bullish? ${isEmaBullish}`;
                console.log(`[HPF DEBUG Long] ${logMsg}`);
                currentDebugInfo.long_emaCheck = logMsg;
            }
            if (!isEmaBullish) continue;

            const highSinceBos = Math.max(...data.slice(bosIndexLong, i + 1).map(c => c.high));
            const fibRangeLong = highSinceBos - peakLow;
            const fib50Long = highSinceBos - fibRangeLong * fibLevel1;
            if (debug) {
                const logMsg = `Fib level calculated. High since BOS: ${highSinceBos}, Fib Range: ${fibRangeLong}, Fib Entry: ${fib50Long}`;
                console.log(`[HPF DEBUG Long] ${logMsg}`);
                currentDebugInfo.long_fibCalc = logMsg;
            }

            if (currentCandle.low <= fib50Long && data[i - 1].low > fib50Long) {
                signals++;
                if (debug) {
                    const logMsg = `LONG SIGNAL TRIGGERED: fib50Long=${fib50Long}, low=${currentCandle.low}, price=${currentCandle.close}`;
                    console.log(`%c[HPF DEBUG] ${logMsg} at candle ${i}`, 'color: green; font-weight: bold;');
                    currentDebugInfo.long_SIGNAL = logMsg;
                }
                if (reverse) {
                    dataWithIndicators[i].sellSignal = fib50Long;
                } else {
                    dataWithIndicators[i].buySignal = fib50Long;
                }
                dataWithIndicators[i].stopLossLevel = peakLow * 0.999;
                dataWithIndicators[i].peakPrice = peakLow;
            }
        }

        if (debug) {
            if (signals === 0) {
                console.log("[HPF DEBUG] No signals generated in this run.");
            } else {
                console.log(`[HPF DEBUG] Total signals generated: ${signals}`);
            }
        }

        return dataWithIndicators;
    }
}

export default hyperPeakFormationStrategy;
