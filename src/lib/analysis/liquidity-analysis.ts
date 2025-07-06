
'use server';

import type { HistoricalData, LiquidityEvent } from '@/lib/types';

interface LiquidityAnalysisParams {
    lookaround: number; // How many bars to look left and right to confirm a swing point
    confirmationCandles: number; // How many bars to wait for a reclaim after a sweep
    maxLookahead: number; // How far to look for a sweep after a swing point
}

const defaultParams: LiquidityAnalysisParams = {
    lookaround: 5,
    confirmationCandles: 3,
    maxLookahead: 50,
};

function isSwingHigh(data: HistoricalData[], index: number, lookaround: number): boolean {
    if (index < lookaround || index >= data.length - lookaround) return false;
    const currentHigh = data[index].high;
    for (let i = 1; i <= lookaround; i++) {
        if (data[index - i].high > currentHigh || data[index + i].high > currentHigh) {
            return false;
        }
    }
    return true;
}

function isSwingLow(data: HistoricalData[], index: number, lookaround: number): boolean {
    if (index < lookaround || index >= data.length - lookaround) return false;
    const currentLow = data[index].low;
    for (let i = 1; i <= lookaround; i++) {
        if (data[index - i].low < currentLow || data[index + i].low < currentLow) {
            return false;
        }
    }
    return true;
}

export async function findLiquidityGrabs(
    data: HistoricalData[],
    params: LiquidityAnalysisParams = defaultParams
): Promise<LiquidityEvent[]> {

    const events: LiquidityEvent[] = [];
    if (data.length < params.lookaround * 2 + 1) return events;

    // The main loop iterates through potential swing points.
    // It should scan the whole dataset, respecting the lookaround boundaries.
    mainLoop: for (let i = params.lookaround; i < data.length - params.lookaround; i++) {

        // Check for Bearish Liquidity Grab (sweeping a swing high)
        if (isSwingHigh(data, i, params.lookaround)) {
            const swingHighPrice = data[i].high;
            // Look ahead for the sweep
            for (let j = i + 1; j < i + params.maxLookahead && j < data.length; j++) {
                if (data[j].high > swingHighPrice) { // Sweep occurred at index j
                    // Check for reversal: a *subsequent* candle closes back below the swing high
                    for (let k = j + 1; k < j + 1 + params.confirmationCandles && k < data.length; k++) {
                        if (data[k].close < swingHighPrice) {
                            events.push({
                                time: data[k].time,
                                priceLevel: swingHighPrice,
                                direction: 'bearish', // Price moved down after grabbing highs
                                type: 'grab',
                                volume: data[j].volume, // Volume from the sweep candle
                            });
                            i = k; // Move past this event to avoid re-detecting
                            continue mainLoop;
                        }
                    }
                }
            }
        }

        // Check for Bullish Liquidity Grab (sweeping a swing low)
        if (isSwingLow(data, i, params.lookaround)) {
            const swingLowPrice = data[i].low;
            // Look ahead for the sweep
            for (let j = i + 1; j < i + params.maxLookahead && j < data.length; j++) {
                if (data[j].low < swingLowPrice) { // Sweep occurred at index j
                    // Check for reversal: a *subsequent* candle closes back above the swing low
                    for (let k = j + 1; k < j + 1 + params.confirmationCandles && k < data.length; k++) {
                        if (data[k].close > swingLowPrice) {
                             events.push({
                                time: data[k].time,
                                priceLevel: swingLowPrice,
                                direction: 'bullish', // Price moved up after grabbing lows
                                type: 'grab',
                                volume: data[j].volume, // Volume from the sweep candle
                            });
                            i = k; // Move past this event
                            continue mainLoop;
                        }
                    }
                }
            }
        }
    }

    return events;
}
