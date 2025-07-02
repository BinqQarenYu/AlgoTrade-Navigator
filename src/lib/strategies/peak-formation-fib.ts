
'use server';

import type { HistoricalData } from '../types';
import { calculateEMA } from '../indicators';

const PEAK_LOOKAROUND = 5; // How many bars on each side to confirm a peak
const SWING_LOOKAROUND = 3; // How many bars on each side to confirm a swing point for BoS
const EMA_SHORT_PERIOD = 13;
const EMA_LONG_PERIOD = 50;
const FIB_LEVELS = [0.5, 0.618]; // 50% and 61.8% retracement levels

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


export const calculatePeakFormationFibSignals = (data: HistoricalData[]): HistoricalData[] => {
    const dataWithSignals = JSON.parse(JSON.stringify(data)); // Deep copy to avoid mutation
    if (data.length < EMA_LONG_PERIOD) return dataWithSignals;

    const closePrices = data.map(d => d.close);
    const ema13 = calculateEMA(closePrices, EMA_SHORT_PERIOD);
    const ema50 = calculateEMA(closePrices, EMA_LONG_PERIOD);

    const swingLows = findSwingLows(data, SWING_LOOKAROUND);
    const swingHighs = findSwingHighs(data, SWING_LOOKAROUND);

    // State machine variables
    let tradeDirection: 'long' | 'short' | null = null;
    let peakIndex: number | null = null;
    let lookingForPullback = false;
    let pullbackStartIndex: number | null = null;
    let pullbackEndIndex: number | null = null;

    for (let i = PEAK_LOOKAROUND; i < data.length - PEAK_LOOKAROUND; i++) {
        // Reset if a new peak invalidates the current pullback search
        if(lookingForPullback && peakIndex !== null) {
            if(tradeDirection === 'short' && data[i].high > data[peakIndex].high) {
                tradeDirection = null;
            }
            if(tradeDirection === 'long' && data[i].low < data[peakIndex].low) {
                tradeDirection = null;
            }
        }

        if (tradeDirection === null) {
            // Check for Peak Formation High (PFH)
            let isPFH = true;
            for (let j = 1; j <= PEAK_LOOKAROUND; j++) {
                if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) {
                    isPFH = false;
                    break;
                }
            }

            if (isPFH) {
                const emaCrossIndex = findBearishEmaCross(ema13, ema50, i);
                if (emaCrossIndex !== -1) {
                    const relevantSwingLowIndex = findLastSwingLowBefore(swingLows, i);
                    if (relevantSwingLowIndex !== null) {
                        const bosIndex = findBreakBelow(data, relevantSwingLowIndex, i);
                        if (bosIndex !== -1 && bosIndex > emaCrossIndex) {
                            tradeDirection = 'short';
                            peakIndex = i;
                            lookingForPullback = true;
                            pullbackStartIndex = bosIndex;
                            pullbackEndIndex = null;
                        }
                    }
                }
            }
            
            // Check for Peak Formation Low (PFL)
            let isPFL = true;
            for (let j = 1; j <= PEAK_LOOKAROUND; j++) {
                if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) {
                    isPFL = false;
                    break;
                }
            }

            if (isPFL) {
                const emaCrossIndex = findBullishEmaCross(ema13, ema50, i);
                 if (emaCrossIndex !== -1) {
                    const relevantSwingHighIndex = findLastSwingHighBefore(swingHighs, i);
                    if (relevantSwingHighIndex !== null) {
                        const bosIndex = findBreakAbove(data, relevantSwingHighIndex, i);
                        if (bosIndex !== -1 && bosIndex > emaCrossIndex) {
                            tradeDirection = 'long';
                            peakIndex = i;
                            lookingForPullback = true;
                            pullbackStartIndex = bosIndex;
                            pullbackEndIndex = null;
                        }
                    }
                 }
            }

        } else if (lookingForPullback && pullbackStartIndex !== null && peakIndex !== null) {
            if (tradeDirection === 'short') {
                if (data[i].high < data[i - 1].high && data[i - 1].high < data[i - 2].high) {
                    pullbackEndIndex = i - 2; 
                    const peakHigh = data[peakIndex].high;
                    const pullbackLow = findLowestLowBetween(data, pullbackStartIndex, pullbackEndIndex);
                    
                    if(pullbackLow !== null) {
                        const fibRange = peakHigh - pullbackLow;
                        for (const level of FIB_LEVELS) {
                            const entryPrice = pullbackLow + fibRange * level;
                            for (let k = i; k < data.length; k++) {
                                if (data[k].high >= entryPrice && data[k].low <= entryPrice) {
                                    dataWithSignals[k].sellSignal = entryPrice;
                                    tradeDirection = null;
                                    break; 
                                }
                                if (data[k].low < pullbackLow) break;
                            }
                        }
                    }
                    if (tradeDirection === 'short') { 
                        tradeDirection = null;
                     }
                }

            } else if (tradeDirection === 'long') {
                if (data[i].low > data[i - 1].low && data[i-1].low > data[i-2].low) {
                    pullbackEndIndex = i - 2;
                    const peakLow = data[peakIndex].low;
                    const pullbackHigh = findHighestHighBetween(data, pullbackStartIndex, pullbackEndIndex);

                    if (pullbackHigh !== null) {
                        const fibRange = pullbackHigh - peakLow;
                        for (const level of FIB_LEVELS) {
                            const entryPrice = pullbackHigh - fibRange * level;
                            for (let k = i; k < data.length; k++) {
                                if (data[k].low <= entryPrice && data[k].high >= entryPrice) {
                                    dataWithSignals[k].buySignal = entryPrice;
                                    tradeDirection = null;
                                    break;
                                }
                                if (data[k].high > pullbackHigh) break;
                            }
                        }
                    }
                    if(tradeDirection === 'long'){
                        tradeDirection = null;
                    }
                }
            }
             if (tradeDirection === null) {
                lookingForPullback = false;
                pullbackStartIndex = null;
                pullbackEndIndex = null;
                peakIndex = null;
            }
        }
    }

    return dataWithSignals;
};

// Helper functions for the strategy
const findBearishEmaCross = (ema13: (number|null)[], ema50: (number|null)[], fromIndex: number) => {
    for (let i = fromIndex; i < ema13.length; i++) {
        if (ema13[i-1] && ema50[i-1] && ema13[i] && ema50[i]) {
            if (ema13[i-1] >= ema50[i-1] && ema13[i] < ema50[i]) return i;
        }
    }
    return -1;
}

const findBullishEmaCross = (ema13: (number|null)[], ema50: (number|null)[], fromIndex: number) => {
    for (let i = fromIndex; i < ema13.length; i++) {
         if (ema13[i-1] && ema50[i-1] && ema13[i] && ema50[i]) {
            if (ema13[i-1] <= ema50[i-1] && ema13[i] > ema50[i]) return i;
        }
    }
    return -1;
}

const findLastSwingLowBefore = (swingLows: number[], index: number) => {
    const relevant = swingLows.filter(sw => sw < index);
    return relevant.length > 0 ? relevant[relevant.length - 1] : null;
}

const findLastSwingHighBefore = (swingHighs: number[], index: number) => {
    const relevant = swingHighs.filter(sw => sw < index);
    return relevant.length > 0 ? relevant[relevant.length - 1] : null;
}

const findBreakBelow = (data: HistoricalData[], swingLowIndex: number, fromIndex: number) => {
    const level = data[swingLowIndex].low;
    for(let i = fromIndex; i < data.length; i++) {
        if(data[i].close < level) return i;
    }
    return -1;
}

const findBreakAbove = (data: HistoricalData[], swingHighIndex: number, fromIndex: number) => {
    const level = data[swingHighIndex].high;
    for(let i = fromIndex; i < data.length; i++) {
        if(data[i].close > level) return i;
    }
    return -1;
}

const findLowestLowBetween = (data: HistoricalData[], from: number, to: number) => {
    if(from > to) return null;
    let lowest = Infinity;
    for (let i = from; i <= to; i++) {
        if (data[i].low < lowest) {
            lowest = data[i].low;
        }
    }
    return lowest === Infinity ? null : lowest;
}

const findHighestHighBetween = (data: HistoricalData[], from: number, to: number) => {
     if(from > to) return null;
    let highest = -Infinity;
    for (let i = from; i <= to; i++) {
        if (data[i].high > highest) {
            highest = data[i].high;
        }
    }
    return highest === -Infinity ? null : highest;
}
