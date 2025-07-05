'use client';

import type { HistoricalData, Strategy } from '../types';
import { calculateEMA } from '../indicators';

export interface HyperPFFParams {
    peakLookaround: number;
    swingLookaround: number;
    emaShortPeriod: number;
    emaLongPeriod: number;
    fibLevel1: number;
    fibLevel2: number;
    maxLookahead: number;
}

export const defaultHyperPFFParams: HyperPFFParams = {
    peakLookaround: 5,
    swingLookaround: 3,
    emaShortPeriod: 13,
    emaLongPeriod: 50,
    fibLevel1: 0.5,
    fibLevel2: 0.618,
    maxLookahead: 100,
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

const hyperPeakFormationStrategy: Strategy = {
    id: 'hyper-peak-formation',
    name: 'Hyper Peak Formation',
    description: 'A version of Peak Formation Fib with tunable parameters for hyper-optimization.',
    async calculate(data: HistoricalData[], params: HyperPFFParams = defaultHyperPFFParams): Promise<HistoricalData[]> {
        const dataWithIndicators = JSON.parse(JSON.stringify(data));
        if (data.length < params.emaLongPeriod) return dataWithIndicators;

        const closePrices = data.map(d => d.close);
        const emaShort = calculateEMA(closePrices, params.emaShortPeriod);
        const emaLong = calculateEMA(closePrices, params.emaLongPeriod);
        
        dataWithIndicators.forEach((d: HistoricalData, i: number) => {
            d.ema_short = emaShort[i];
            d.ema_long = emaLong[i];
        });

        const swingLows = findSwingLows(data, params.swingLookaround);
        const swingHighs = findSwingHighs(data, params.swingLookaround);

        for (let i = params.peakLookaround; i < data.length - params.peakLookaround; i++) {
            
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
                        if (!emaShort[k-1] || !emaLong[k-1] || !emaShort[k] || !emaLong[k]) continue;

                        const emaCrossed = emaShort[k-1] >= emaLong[k-1] && emaShort[k] < emaLong[k];
                        const structureBroken = data[k].close < data[relevantSwingLowIndex].low;

                        if (emaCrossed && structureBroken) {
                            const bosIndex = k;
                            let pullbackLow = data[bosIndex].low;

                            for (let l = bosIndex + 1; l < Math.min(bosIndex + params.maxLookahead, data.length); l++) {
                                if (data[l].low < pullbackLow) {
                                    pullbackLow = data[l].low;
                                }
                                
                                if (data[l].high > peakHigh) break;
                                
                                const fibRange = peakHigh - pullbackLow;
                                const fibLevel1 = pullbackLow + fibRange * params.fibLevel1;
                                const fibLevel2 = pullbackLow + fibRange * params.fibLevel2;
                                
                                if (data[l].high >= fibLevel1) {
                                    dataWithIndicators[l].sellSignal = dataWithIndicators[l].sellSignal ?? fibLevel1;
                                    dataWithIndicators[l].stopLossLevel = peakHigh;
                                    dataWithIndicators[l].peakPrice = peakHigh;
                                }
                                if (data[l].high >= fibLevel2) {
                                    dataWithIndicators[l].sellSignal = dataWithIndicators[l].sellSignal ?? fibLevel2;
                                    dataWithIndicators[l].stopLossLevel = peakHigh;
                                    dataWithIndicators[l].peakPrice = peakHigh;
                                }
                            }
                            break;
                        }
                    }
                }
            }

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
                         if (!emaShort[k-1] || !emaLong[k-1] || !emaShort[k] || !emaLong[k]) continue;

                        const emaCrossed = emaShort[k-1] <= emaLong[k-1] && emaShort[k] > emaLong[k];
                        const structureBroken = data[k].close > data[relevantSwingHighIndex].high;

                        if (emaCrossed && structureBroken) {
                            const bosIndex = k;
                            let pullbackHigh = data[bosIndex].high;

                            for (let l = bosIndex + 1; l < Math.min(bosIndex + params.maxLookahead, data.length); l++) {
                                if (data[l].high > pullbackHigh) {
                                    pullbackHigh = data[l].high;
                                }

                                if (data[l].low < peakLow) break;

                                const fibRange = pullbackHigh - peakLow;
                                const fibLevel1 = pullbackHigh - fibRange * params.fibLevel1;
                                const fibLevel2 = pullbackHigh - fibRange * params.fibLevel2;
                                 
                                if (data[l].low <= fibLevel1) {
                                    dataWithIndicators[l].buySignal = dataWithIndicators[l].buySignal ?? fibLevel1;
                                    dataWithIndicators[l].stopLossLevel = peakLow;
                                    dataWithIndicators[l].peakPrice = peakLow;
                                }
                                 if (data[l].low <= fibLevel2) {
                                    dataWithIndicators[l].buySignal = dataWithIndicators[l].buySignal ?? fibLevel2;
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

export default hyperPeakFormationStrategy;

const findLastSwingLowBefore = (swingLows: number[], index: number) => {
    const relevant = swingLows.filter(sw => sw < index);
    return relevant.length > 0 ? relevant[relevant.length - 1] : null;
}

const findLastSwingHighBefore = (swingHighs: number[], index: number) => {
    const relevant = swingHighs.filter(sw => sw < index);
    return relevant.length > 0 ? relevant[relevant.length - 1] : null;
}
