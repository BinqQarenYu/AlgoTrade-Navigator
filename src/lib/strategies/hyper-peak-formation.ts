
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
    maxLookahead: number;
    signalStaleness: number; // How many candles a signal remains valid
    reverse?: boolean;
    discipline: DisciplineParams;
}

export const defaultHyperPFFParams: HyperPFFParams = {
    peakLookaround: 5,
    swingLookaround: 3,
    emaShortPeriod: 13,
    emaLongPeriod: 50,
    fibLevel1: 0.5,
    fibLevel2: 0.618,
    maxLookahead: 100,
    signalStaleness: 25,
    reverse: false,
    discipline: {
        enableDiscipline: true,
        maxConsecutiveLosses: 2,
        cooldownPeriodMinutes: 15,
        dailyDrawdownLimit: 10,
        onFailure: 'Cooldown',
    },
};

// --- NON-REPAINTING HELPERS ---

// Checks if a candle at 'index' is a confirmed swing high/low based *only* on past data.
// A high is confirmed only after 'lookaround' bars to its right have closed without making a higher high.
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
    name: 'Hyper Peak Formation',
    description: 'A version of Peak Formation Fib with tunable parameters for hyper-optimization.',
    async calculate(data: HistoricalData[], params: HyperPFFParams = defaultHyperPFFParams): Promise<HistoricalData[]> {
        const dataWithIndicators = JSON.parse(JSON.stringify(data));
        const { peakLookaround, swingLookaround, emaShortPeriod, emaLongPeriod, fibLevel1, fibLevel2, maxLookahead, reverse } = params;

        if (data.length < emaLongPeriod) return dataWithIndicators;

        const closePrices = data.map(d => d.close);
        const emaShort = calculateEMA(closePrices, emaShortPeriod);
        const emaLong = calculateEMA(closePrices, emaLongPeriod);
        
        dataWithIndicators.forEach((d: HistoricalData, i: number) => {
            d.ema_short = emaShort[i];
            d.ema_long = emaLong[i];
        });

        // Loop through each candle as if it's the "current" candle in a live scenario
        for (let i = peakLookaround; i < data.length - 1; i++) {
            
            // --- SHORT SETUP ---
            // 1. Identify a *confirmed* Peak Formation High (PFH) in the past.
            const pfhIndex = i - peakLookaround; // The potential peak is 'peakLookaround' candles ago
            if (isConfirmedSwingHigh(data, pfhIndex, peakLookaround)) {
                const peakHigh = data[pfhIndex].high;

                // 2. Find the last relevant swing low *before* the peak.
                let swingLowIndex = -1;
                for (let j = pfhIndex - 1; j >= pfhIndex - swingLookaround - 50 && j >= 0; j--) {
                    if (isConfirmedSwingLow(data, j, swingLookaround)) {
                        swingLowIndex = j;
                        break;
                    }
                }

                if (swingLowIndex !== -1) {
                    const swingLowPrice = data[swingLowIndex].low;

                    // 3. Confirm a Break of Structure (BOS) has occurred *after* the peak and *before* now.
                    let bosIndex = -1;
                    for (let k = pfhIndex + 1; k <= i; k++) {
                        if (data[k].close < swingLowPrice) {
                            bosIndex = k;
                            break;
                        }
                    }

                    if (bosIndex !== -1) {
                         // 4. Confirm EMA cross happened at or after the BOS.
                        const emaCrossed = emaShort[bosIndex]! < emaLong[bosIndex]!;
                        
                        if (emaCrossed) {
                            // 5. Look for a pullback into the Fibonacci zone on the *current* candle 'i'.
                            const pullbackLowCandleIndex = data.slice(bosIndex, i + 1).reduce((minIndex, current, idx) => {
                                return current.low < data[minIndex].low ? bosIndex + idx : minIndex;
                            }, bosIndex);
                            const pullbackLow = data[pullbackLowCandleIndex].low;

                            const fibRange = peakHigh - pullbackLow;
                            const fib50 = pullbackLow + fibRange * fibLevel1;
                            
                            if (data[i].high >= fib50) {
                                if (reverse) {
                                    dataWithIndicators[i].buySignal = fib50;
                                } else {
                                    dataWithIndicators[i].sellSignal = fib50;
                                }
                                dataWithIndicators[i].stopLossLevel = peakHigh * 1.001; // SL slightly above the peak
                                dataWithIndicators[i].peakPrice = peakHigh;
                            }
                        }
                    }
                }
            }

            // --- LONG SETUP --- (Reverse logic of the short setup)
            const pflIndex = i - peakLookaround;
            if (isConfirmedSwingLow(data, pflIndex, peakLookaround)) {
                const peakLow = data[pflIndex].low;

                let swingHighIndex = -1;
                for (let j = pflIndex - 1; j >= pflIndex - swingLookaround - 50 && j >= 0; j--) {
                    if (isConfirmedSwingHigh(data, j, swingLookaround)) {
                        swingHighIndex = j;
                        break;
                    }
                }

                if (swingHighIndex !== -1) {
                    const swingHighPrice = data[swingHighIndex].high;
                    
                    let bosIndex = -1;
                    for (let k = pflIndex + 1; k <= i; k++) {
                        if (data[k].close > swingHighPrice) {
                            bosIndex = k;
                            break;
                        }
                    }
                    
                    if (bosIndex !== -1) {
                        const emaCrossed = emaShort[bosIndex]! > emaLong[bosIndex]!;

                        if (emaCrossed) {
                            const pullbackHighCandleIndex = data.slice(bosIndex, i + 1).reduce((maxIndex, current, idx) => {
                                return current.high > data[maxIndex].high ? bosIndex + idx : maxIndex;
                            }, bosIndex);
                            const pullbackHigh = data[pullbackHighCandleIndex].high;

                            const fibRange = pullbackHigh - peakLow;
                            const fib50 = pullbackHigh - fibRange * fibLevel1;

                            if (data[i].low <= fib50) {
                                if (reverse) {
                                    dataWithIndicators[i].sellSignal = fib50;
                                } else {
                                    dataWithIndicators[i].buySignal = fib50;
                                }
                                dataWithIndicators[i].stopLossLevel = peakLow * 0.999;
                                dataWithIndicators[i].peakPrice = peakLow;
                            }
                        }
                    }
                }
            }
        }
        return dataWithIndicators;
    }
}

export default hyperPeakFormationStrategy;
