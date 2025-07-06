
'use server';

import type { HistoricalData, LiquidityEvent, LiquidityTarget } from '@/lib/types';

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

    // The main loop iterates through the entire dataset to find potential patterns.
    mainLoop: for (let i = params.lookaround; i < data.length - params.lookaround; i++) {

        // Check for Bearish Liquidity Grab (sweeping a swing high)
        if (isSwingHigh(data, i, params.lookaround)) {
            const swingHighPrice = data[i].high;
            // Look ahead for the sweep
            for (let j = i + 1; j < data.length; j++) {
                if (j >= i + params.maxLookahead) break; // Stop looking if it's too far in the future
                
                if (data[j].high > swingHighPrice) { // Sweep occurred at index j
                    // Check for reversal: a *subsequent* candle closes back below the swing high
                    for (let k = j + 1; k < data.length; k++) {
                         if (k >= j + 1 + params.confirmationCandles) break; // Stop if confirmation takes too long

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
            for (let j = i + 1; j < data.length; j++) {
                if (j >= i + params.maxLookahead) break;

                if (data[j].low < swingLowPrice) { // Sweep occurred at index j
                    // Check for reversal: a *subsequent* candle closes back above the swing low
                     for (let k = j + 1; k < data.length; k++) {
                        if (k >= j + 1 + params.confirmationCandles) break;

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

export async function findLiquidityTargets(
    data: HistoricalData[],
    lookaround: number = 5
): Promise<LiquidityTarget[]> {
    if (data.length < lookaround * 2 + 1) return [];

    const targets: LiquidityTarget[] = [];
    const recentData = data.slice(-200); // Analyze the last 200 candles for recent targets
    if (recentData.length === 0) return [];
    
    const currentPrice = recentData[recentData.length - 1].close;

    // Find the highest swing high that is still above the current price
    let buySideTarget: number | null = null;
    for (let i = recentData.length - lookaround - 1; i >= lookaround; i--) {
        if (isSwingHigh(recentData, i, lookaround)) {
            const highPrice = recentData[i].high;
            if (highPrice > currentPrice) {
                let swept = false;
                for (let j = i + 1; j < recentData.length; j++) {
                    if (recentData[j].high > highPrice) {
                        swept = true;
                        break;
                    }
                }
                if (!swept) {
                    buySideTarget = highPrice;
                    break; 
                }
            }
        }
    }
    if (buySideTarget) {
        targets.push({ priceLevel: buySideTarget, type: 'buy-side' });
    }

    // Find the lowest swing low that is still below the current price
    let sellSideTarget: number | null = null;
    for (let i = recentData.length - lookaround - 1; i >= lookaround; i--) {
        if (isSwingLow(recentData, i, lookaround)) {
            const lowPrice = recentData[i].low;
            if (lowPrice < currentPrice) {
                let swept = false;
                for (let j = i + 1; j < recentData.length; j++) {
                    if (recentData[j].low < lowPrice) {
                        swept = true;
                        break;
                    }
                }
                if (!swept) {
                    sellSideTarget = lowPrice;
                    break;
                }
            }
        }
    }
     if (sellSideTarget) {
        targets.push({ priceLevel: sellSideTarget, type: 'sell-side' });
    }

    return targets;
}
