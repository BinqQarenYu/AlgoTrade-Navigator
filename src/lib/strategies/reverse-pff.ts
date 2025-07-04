
'use client';

import type { HistoricalData, Strategy } from '../types';
import { calculateEMA } from '../indicators';

const PEAK_LOOKAROUND = 5; // How many bars on each side to confirm a peak
const SWING_LOOKAROUND = 3; // How many bars on each side to confirm a swing point for BoS
const EMA_SHORT_PERIOD = 13;
const EMA_LONG_PERIOD = 50;
const FIB_LEVELS = [0.5, 0.618]; // 50% and 61.8% retracement levels
const MAX_LOOKAHEAD = 100; // Max bars to look for a Break of Structure and subsequent pullback

/**
 * Finds swing lows in the data, which are essential for identifying breaks of structure.
 * A swing low is a point where the low is lower than the lows of the surrounding bars.
 */
function findSwingLows(data: HistoricalData[], lookaround: number): number[] {
    const swingLows: number[] = [];
    for (let i = lookaround; i < data.length - lookaround; i++) {
        let isSwingLow = true;
        for (let j = 1; j <= lookaround; j++) {
            if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) {
                isSwingLow = false;
                break;
            }
        }
        if (isSwingLow) {
            swingLows.push(i);
        }
    }
    return swingLows;
}

/**
 * Finds swing highs in the data.
 * A swing high is a point where the high is higher than the highs of the surrounding bars.
 */
function findSwingHighs(data: HistoricalData[], lookaround: number): number[] {
    const swingHighs: number[] = [];
    for (let i = lookaround; i < data.length - lookaround; i++) {
        let isSwingHigh = true;
        for (let j = 1; j <= lookaround; j++) {
            if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) {
                isSwingHigh = false;
                break;
            }
        }
        if (isSwingHigh) {
            swingHighs.push(i);
        }
    }
    return swingHighs;
}

const reversePffStrategy: Strategy = {
    id: 'reverse-pff',
    name: 'Reverse PFF',
    description: 'A contrarian strategy that shorts PFF long signals and longs PFF short signals.',
    async calculate(data: HistoricalData[]): Promise<HistoricalData[]> {
        const dataWithIndicators = JSON.parse(JSON.stringify(data)); // Deep copy
        if (data.length < EMA_LONG_PERIOD) return dataWithIndicators;

        const closePrices = data.map(d => d.close);
        const ema13 = calculateEMA(closePrices, EMA_SHORT_PERIOD);
        const ema50 = calculateEMA(closePrices, EMA_LONG_PERIOD);
        
        dataWithIndicators.forEach((d: HistoricalData, i: number) => {
            d.ema_short = ema13[i];
            d.ema_long = ema50[i];
        });

        const swingLows = findSwingLows(data, SWING_LOOKAROUND);
        const swingHighs = findSwingHighs(data, SWING_LOOKAROUND);

        for (let i = PEAK_LOOKAROUND; i < data.length - PEAK_LOOKAROUND; i++) {
            
            // --- Look for a PFH to generate a LONG signal (REVERSE LOGIC) ---
            let isPFH = true;
            for (let j = 1; j <= PEAK_LOOKAROUND; j++) {
                if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) {
                    isPFH = false;
                    break;
                }
            }

            if (isPFH) {
                const peakHigh = data[i].high;
                const relevantSwingLowIndex = findLastSwingLowBefore(swingLows, i);
                if (relevantSwingLowIndex !== null) {
                    for (let k = i + 1; k < Math.min(i + MAX_LOOKAHEAD, data.length); k++) {
                        if (!ema13[k-1] || !ema50[k-1] || !ema13[k] || !ema50[k]) continue;

                        const emaCrossed = ema13[k-1] >= ema50[k-1] && ema13[k] < ema50[k];
                        const structureBroken = data[k].close < data[relevantSwingLowIndex].low;

                        if (emaCrossed && structureBroken) {
                            const bosIndex = k;
                            let pullbackLow = data[bosIndex].low;

                            for (let l = bosIndex + 1; l < Math.min(bosIndex + MAX_LOOKAHEAD, data.length); l++) {
                                if (data[l].low < pullbackLow) {
                                    pullbackLow = data[l].low;
                                }
                                
                                if (data[l].high > peakHigh) {
                                    break; 
                                }
                                
                                const fibRange = peakHigh - pullbackLow;
                                const fib50 = pullbackLow + fibRange * FIB_LEVELS[0];
                                const fib618 = pullbackLow + fibRange * FIB_LEVELS[1];
                                
                                if (data[l].high >= fib50) {
                                    dataWithIndicators[l].buySignal = dataWithIndicators[l].buySignal ?? fib50;
                                    dataWithIndicators[l].stopLossLevel = peakHigh;
                                    dataWithIndicators[l].peakPrice = peakHigh;
                                }
                                if (data[l].high >= fib618) {
                                    dataWithIndicators[l].buySignal = dataWithIndicators[l].buySignal ?? fib618;
                                    dataWithIndicators[l].stopLossLevel = peakHigh;
                                    dataWithIndicators[l].peakPrice = peakHigh;
                                }
                            }
                            break;
                        }
                    }
                }
            }

            // --- Look for a PFL to generate a SHORT signal (REVERSE LOGIC) ---
            let isPFL = true;
            for (let j = 1; j <= PEAK_LOOKAROUND; j++) {
                if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) {
                    isPFL = false;
                    break;
                }
            }
            
            if (isPFL) {
                const peakLow = data[i].low;
                const relevantSwingHighIndex = findLastSwingHighBefore(swingHighs, i);
                if (relevantSwingHighIndex !== null) {
                    for (let k = i + 1; k < Math.min(i + MAX_LOOKAHEAD, data.length); k++) {
                         if (!ema13[k-1] || !ema50[k-1] || !ema13[k] || !ema50[k]) continue;

                        const emaCrossed = ema13[k-1] <= ema50[k-1] && ema13[k] > ema50[k];
                        const structureBroken = data[k].close > data[relevantSwingHighIndex].high;

                        if (emaCrossed && structureBroken) {
                            const bosIndex = k;
                            let pullbackHigh = data[bosIndex].high;

                            for (let l = bosIndex + 1; l < Math.min(bosIndex + MAX_LOOKAHEAD, data.length); l++) {
                                if (data[l].high > pullbackHigh) {
                                    pullbackHigh = data[l].high;
                                }

                                if (data[l].low < peakLow) {
                                    break;
                                }

                                const fibRange = pullbackHigh - peakLow;
                                const fib50 = pullbackHigh - fibRange * FIB_LEVELS[0];
                                const fib618 = pullbackHigh - fibRange * FIB_LEVELS[1];
                                 
                                if (data[l].low <= fib50) {
                                    dataWithIndicators[l].sellSignal = dataWithIndicators[l].sellSignal ?? fib50;
                                    dataWithIndicators[l].stopLossLevel = peakLow;
                                    dataWithIndicators[l].peakPrice = peakLow;
                                }
                                 if (data[l].low <= fib618) {
                                    dataWithIndicators[l].sellSignal = dataWithIndicators[l].sellSignal ?? fib618;
                                    dataWithIndicators[l].stopLossLevel = peakLow;
                                    dataWithIndicators[l].peakPrice = peakLow;
                                }
                            }
                            break; 
                        }
                    }
                }
            }
        }
        return dataWithIndicators;
    }
}

export default reversePffStrategy;

// Helper functions for the strategy
const findLastSwingLowBefore = (swingLows: number[], index: number) => {
    const relevant = swingLows.filter(sw => sw < index);
    return relevant.length > 0 ? relevant[relevant.length - 1] : null;
}

const findLastSwingHighBefore = (swingHighs: number[], index: number) => {
    const relevant = swingHighs.filter(sw => sw < index);
    return relevant.length > 0 ? relevant[relevant.length - 1] : null;
}
