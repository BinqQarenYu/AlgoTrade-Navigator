'use client';

import type { HistoricalData, Strategy } from '../types';
import { calculateEMA } from '../indicators';

export interface PffParams {
    peakLookaround: number;
    swingLookaround: number;
    emaShortPeriod: number;
    emaLongPeriod: number;
    fibLevel1: number;
    fibLevel2: number;
    maxLookahead: number;
    reverse?: boolean;
}

export const defaultPffParams: PffParams = {
    peakLookaround: 5,
    swingLookaround: 3,
    emaShortPeriod: 13,
    emaLongPeriod: 50,
    fibLevel1: 0.5,
    fibLevel2: 0.618,
    maxLookahead: 100,
    reverse: false,
};

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

const peakFormationFibStrategy: Strategy = {
    id: 'peak-formation-fib',
    name: 'Peak Formation Fib',
    description: 'An advanced strategy that identifies market peaks, waits for a break of structure, and enters on a Fibonacci retracement.',
    async calculate(data: HistoricalData[], params: PffParams = defaultPffParams): Promise<HistoricalData[]> {
        const dataWithIndicators = JSON.parse(JSON.stringify(data)); // Deep copy
        if (data.length < params.emaLongPeriod) return dataWithIndicators;

        const closePrices = data.map(d => d.close);
        const ema13 = calculateEMA(closePrices, params.emaShortPeriod);
        const ema50 = calculateEMA(closePrices, params.emaLongPeriod);
        
        dataWithIndicators.forEach((d: HistoricalData, i: number) => {
            d.ema_short = ema13[i];
            d.ema_long = ema50[i];
        });

        const swingLows = findSwingLows(data, params.swingLookaround);
        const swingHighs = findSwingHighs(data, params.swingLookaround);

        for (let i = params.peakLookaround; i < data.length - params.peakLookaround; i++) {
            
            // --- Look for a SHORT setup (PFH) ---
            let isPFH = true;
            for (let j = 1; j <= params.peakLookaround; j++) {
                if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) {
                    isPFH = false;
                    break;
                }
            }

            if (isPFH) {
                const peakHigh = data[i].high;
                const relevantSwingLowIndex = findLastSwingLowBefore(swingLows, i);
                if (relevantSwingLowIndex !== null) {
                    for (let k = i + 1; k < Math.min(i + params.maxLookahead, data.length); k++) {
                        if (!ema13[k-1] || !ema50[k-1] || !ema13[k] || !ema50[k]) continue;

                        const emaCrossed = ema13[k-1] >= ema50[k-1] && ema13[k] < ema50[k];
                        const structureBroken = data[k].close < data[relevantSwingLowIndex].low;

                        if (emaCrossed && structureBroken) {
                            const bosIndex = k;
                            let pullbackLow = data[bosIndex].low;

                            for (let l = bosIndex + 1; l < Math.min(bosIndex + params.maxLookahead, data.length); l++) {
                                if (data[l].low < pullbackLow) {
                                    pullbackLow = data[l].low;
                                }
                                
                                if (data[l].high > peakHigh) {
                                    break; 
                                }
                                
                                const fibRange = peakHigh - pullbackLow;
                                const fib50 = pullbackLow + fibRange * params.fibLevel1;
                                const fib618 = pullbackLow + fibRange * params.fibLevel2;
                                
                                if (data[l].high >= fib50) {
                                    if(params.reverse) dataWithIndicators[l].buySignal = dataWithIndicators[l].buySignal ?? fib50;
                                    else dataWithIndicators[l].sellSignal = dataWithIndicators[l].sellSignal ?? fib50;
                                    dataWithIndicators[l].stopLossLevel = peakHigh;
                                    dataWithIndicators[l].peakPrice = peakHigh;
                                }
                                if (data[l].high >= fib618) {
                                    if (params.reverse) dataWithIndicators[l].buySignal = dataWithIndicators[l].buySignal ?? fib618;
                                    else dataWithIndicators[l].sellSignal = dataWithIndicators[l].sellSignal ?? fib618;
                                    dataWithIndicators[l].stopLossLevel = peakHigh;
                                    dataWithIndicators[l].peakPrice = peakHigh;
                                }
                            }
                            break;
                        }
                    }
                }
            }

            // --- Look for a LONG setup (PFL) ---
            let isPFL = true;
            for (let j = 1; j <= params.peakLookaround; j++) {
                if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) {
                    isPFL = false;
                    break;
                }
            }
            
            if (isPFL) {
                const peakLow = data[i].low;
                const relevantSwingHighIndex = findLastSwingHighBefore(swingHighs, i);
                if (relevantSwingHighIndex !== null) {
                    for (let k = i + 1; k < Math.min(i + params.maxLookahead, data.length); k++) {
                         if (!ema13[k-1] || !ema50[k-1] || !ema13[k] || !ema50[k]) continue;

                        const emaCrossed = ema13[k-1] <= ema50[k-1] && ema13[k] > ema50[k];
                        const structureBroken = data[k].close > data[relevantSwingHighIndex].high;

                        if (emaCrossed && structureBroken) {
                            const bosIndex = k;
                            let pullbackHigh = data[bosIndex].high;

                            for (let l = bosIndex + 1; l < Math.min(bosIndex + params.maxLookahead, data.length); l++) {
                                if (data[l].high > pullbackHigh) {
                                    pullbackHigh = data[l].high;
                                }

                                if (data[l].low < peakLow) {
                                    break;
                                }

                                const fibRange = pullbackHigh - peakLow;
                                const fib50 = pullbackHigh - fibRange * params.fibLevel1;
                                const fib618 = pullbackHigh - fibRange * params.fibLevel2;
                                 
                                if (data[l].low <= fib50) {
                                    if(params.reverse) dataWithIndicators[l].sellSignal = dataWithIndicators[l].sellSignal ?? fib50;
                                    else dataWithIndicators[l].buySignal = dataWithIndicators[l].buySignal ?? fib50;
                                    dataWithIndicators[l].stopLossLevel = peakLow;
                                    dataWithIndicators[l].peakPrice = peakLow;
                                }
                                 if (data[l].low <= fib618) {
                                    if(params.reverse) dataWithIndicators[l].sellSignal = dataWithIndicators[l].sellSignal ?? fib618;
                                    else dataWithIndicators[l].buySignal = dataWithIndicators[l].buySignal ?? fib618;
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

export default peakFormationFibStrategy;

// Helper functions for the strategy
const findLastSwingLowBefore = (swingLows: number[], index: number) => {
    const relevant = swingLows.filter(sw => sw < index);
    return relevant.length > 0 ? relevant[relevant.length - 1] : null;
}

const findLastSwingHighBefore = (swingHighs: number[], index: number) => {
    const relevant = swingHighs.filter(sw => sw < index);
    return relevant.length > 0 ? relevant[relevant.length - 1] : null;
}
