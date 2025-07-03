
'use client';

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
export function findSwingLows(data: HistoricalData[], lookaround: number): number[] {
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
export function findSwingHighs(data: HistoricalData[], lookaround: number): number[] {
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


export async function calculatePeakFormationFibSignals(data: HistoricalData[]): Promise<HistoricalData[]> {
    const dataWithSignals = JSON.parse(JSON.stringify(data)); // Deep copy
    if (data.length < EMA_LONG_PERIOD) return dataWithSignals;

    const closePrices = data.map(d => d.close);
    const ema13 = calculateEMA(closePrices, EMA_SHORT_PERIOD);
    const ema50 = calculateEMA(closePrices, EMA_LONG_PERIOD);
    const swingLows = findSwingLows(data, SWING_LOOKAROUND);
    const swingHighs = findSwingHighs(data, SWING_LOOKAROUND);

    // This loop identifies potential setups (Peak + Cross + BoS)
    for (let i = PEAK_LOOKAROUND; i < data.length - PEAK_LOOKAROUND; i++) {
        
        // --- Look for a SHORT setup (PFH) ---
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
                // Now look forward from the peak for the cross and BoS
                for (let k = i + 1; k < data.length; k++) {
                    if (!ema13[k-1] || !ema50[k-1] || !ema13[k] || !ema50[k]) continue;

                    const emaCrossed = ema13[k-1] >= ema50[k-1] && ema13[k] < ema50[k];
                    const structureBroken = data[k].close < data[relevantSwingLowIndex].low;

                    if (emaCrossed && structureBroken) {
                        const bosIndex = k;
                        let pullbackLow = data[bosIndex].low;

                        // Now look for the Fib entry after the BoS
                        for (let l = bosIndex + 1; l < data.length; l++) {
                            // Update the pullback low if price makes a new low
                            if (data[l].low < pullbackLow) {
                                pullbackLow = data[l].low;
                            }
                            
                            // If price goes above the peak, the setup is invalid
                            if (data[l].high > peakHigh) {
                                break; 
                            }
                            
                            const fibRange = peakHigh - pullbackLow;
                            const fib50 = pullbackLow + fibRange * FIB_LEVELS[0];
                            const fib618 = pullbackLow + fibRange * FIB_LEVELS[1];
                            
                            // Check if the current candle hits one of the fib levels
                            if (data[l].high >= fib50) {
                                dataWithSignals[l].sellSignal = dataWithSignals[l].sellSignal ?? fib50;
                                dataWithSignals[l].stopLossLevel = peakHigh;
                                dataWithSignals[l].peakPrice = peakHigh;
                            }
                            if (data[l].high >= fib618) {
                                dataWithSignals[l].sellSignal = dataWithSignals[l].sellSignal ?? fib618;
                                dataWithSignals[l].stopLossLevel = peakHigh;
                                dataWithSignals[l].peakPrice = peakHigh;
                            }
                        }
                        break; // Stop looking for a BoS from this peak once one is found
                    }
                }
            }
        }

        // --- Look for a LONG setup (PFL) ---
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
                // Now look forward from the peak for the cross and BoS
                for (let k = i + 1; k < data.length; k++) {
                     if (!ema13[k-1] || !ema50[k-1] || !ema13[k] || !ema50[k]) continue;

                    const emaCrossed = ema13[k-1] <= ema50[k-1] && ema13[k] > ema50[k];
                    const structureBroken = data[k].close > data[relevantSwingHighIndex].high;

                    if (emaCrossed && structureBroken) {
                        const bosIndex = k;
                        let pullbackHigh = data[bosIndex].high;

                        // Now look for the Fib entry after the BoS
                        for (let l = bosIndex + 1; l < data.length; l++) {
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
                                dataWithSignals[l].buySignal = dataWithSignals[l].buySignal ?? fib50;
                                dataWithSignals[l].stopLossLevel = peakLow;
                                dataWithSignals[l].peakPrice = peakLow;
                            }
                             if (data[l].low <= fib618) {
                                dataWithSignals[l].buySignal = dataWithSignals[l].buySignal ?? fib618;
                                dataWithSignals[l].stopLossLevel = peakLow;
                                dataWithSignals[l].peakPrice = peakLow;
                            }
                        }
                        break; 
                    }
                }
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
