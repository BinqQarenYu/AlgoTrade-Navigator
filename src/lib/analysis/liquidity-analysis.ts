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

/**
 * Validates if a specific point is a swing high by comparing it to surrounding candles.
 * A swing high must be strictly greater than or equal to all candles within the lookaround window.
 *
 * @param data Array of historical price data.
 * @param index The current candle index to evaluate.
 * @param lookaround Number of candles to check on both sides.
 * @returns boolean indicating if the point is a swing high.
 */
function isSwingHigh(data: HistoricalData[], index: number, lookaround: number): boolean {
    if (index < lookaround || index >= data.length - lookaround) return false;
    const currentHigh = data[index].high;

    // Check both backward and forward in a single loop
    for (let i = 1; i <= lookaround; i++) {
        // If any surrounding high is strictly greater, it's not a swing high
        if (data[index - i].high > currentHigh || data[index + i].high > currentHigh) {
            return false;
        }
    }
    return true;
}

/**
 * Validates if a specific point is a swing low by comparing it to surrounding candles.
 * A swing low must be strictly less than or equal to all candles within the lookaround window.
 *
 * @param data Array of historical price data.
 * @param index The current candle index to evaluate.
 * @param lookaround Number of candles to check on both sides.
 * @returns boolean indicating if the point is a swing low.
 */
function isSwingLow(data: HistoricalData[], index: number, lookaround: number): boolean {
    if (index < lookaround || index >= data.length - lookaround) return false;
    const currentLow = data[index].low;

    // Check both backward and forward in a single loop
    for (let i = 1; i <= lookaround; i++) {
        // If any surrounding low is strictly lower, it's not a swing low
        if (data[index - i].low < currentLow || data[index + i].low < currentLow) {
            return false;
        }
    }
    return true;
}

/**
 * Scans historical data to identify Liquidity Grabs (sweeps of swing highs/lows followed by a reversal).
 * Optimized to reduce O(N^3) complexity by bounding inner loops strictly by lookahead parameters.
 *
 * @param data Array of historical price data.
 * @param params Configuration parameters for the analysis.
 * @returns A promise resolving to an array of detected LiquidityEvents.
 */
export async function findLiquidityGrabs(
    data: HistoricalData[],
    params: LiquidityAnalysisParams = defaultParams
): Promise<LiquidityEvent[]> {
    const events: LiquidityEvent[] = [];
    const len = data.length;

    // Need at least enough data for one swing point to be formed
    if (len < params.lookaround * 2 + 1) return events;

    // The main loop iterates through the dataset.
    // O(N) outer loop.
    mainLoop: for (let i = params.lookaround; i < len - params.lookaround; i++) {

        // 1. Check for Bearish Liquidity Grab (sweeping a swing high)
        // O(K) where K is lookaround.
        if (isSwingHigh(data, i, params.lookaround)) {
            const swingHighPrice = data[i].high;

            // Look ahead for the sweep. Bounded by maxLookahead. O(L) where L is maxLookahead.
            const sweepLimit = Math.min(len, i + 1 + params.maxLookahead);
            for (let j = i + 1; j < sweepLimit; j++) {
                
                // Sweep detected: price goes above the established swing high
                if (data[j].high > swingHighPrice) {

                    // Look for confirmation reversal: closing below the swing high.
                    // Bounded by confirmationCandles. O(C) where C is confirmationCandles.
                    const confirmLimit = Math.min(len, j + 1 + params.confirmationCandles);
                    for (let k = j + 1; k < confirmLimit; k++) {

                        if (data[k].close < swingHighPrice) {
                            events.push({
                                time: data[k].time,
                                priceLevel: swingHighPrice,
                                direction: 'bearish', // Reversal downwards
                                type: 'grab',
                                volume: data[j].volume, // Volume of the sweeping candle
                            });
                            // Advance main loop past the confirmation to prevent overlapping patterns
                            i = k;
                            continue mainLoop;
                        }
                    }
                    // If a sweep happens but no confirmation within the window, we break the sweep search
                    // for this specific swing point, as the pattern failed.
                    break;
                }
            }
        }

        // 2. Check for Bullish Liquidity Grab (sweeping a swing low)
        // O(K) where K is lookaround.
        if (isSwingLow(data, i, params.lookaround)) {
            const swingLowPrice = data[i].low;

            // Look ahead for the sweep. Bounded by maxLookahead. O(L) where L is maxLookahead.
            const sweepLimit = Math.min(len, i + 1 + params.maxLookahead);
            for (let j = i + 1; j < sweepLimit; j++) {

                // Sweep detected: price goes below the established swing low
                if (data[j].low < swingLowPrice) {

                    // Look for confirmation reversal: closing above the swing low.
                    // Bounded by confirmationCandles. O(C) where C is confirmationCandles.
                    const confirmLimit = Math.min(len, j + 1 + params.confirmationCandles);
                    for (let k = j + 1; k < confirmLimit; k++) {

                        if (data[k].close > swingLowPrice) {
                            events.push({
                                time: data[k].time,
                                priceLevel: swingLowPrice,
                                direction: 'bullish', // Reversal upwards
                                type: 'grab',
                                volume: data[j].volume, // Volume of the sweeping candle
                            });
                            // Advance main loop past the confirmation
                            i = k;
                            continue mainLoop;
                        }
                    }
                    // If a sweep happens but no confirmation within the window, break.
                    break;
                }
            }
        }
    }

    return events;
}

/**
 * Finds recent intact (un-swept) swing highs and lows to act as liquidity targets.
 * Optimized to iterate backwards and short-circuit when targets are found.
 *
 * @param data Array of historical price data.
 * @param lookaround Number of candles to define a swing point.
 * @returns A promise resolving to an array of un-swept LiquidityTargets.
 */
export async function findLiquidityTargets(
    data: HistoricalData[],
    lookaround: number = 5
): Promise<LiquidityTarget[]> {
    if (data.length < lookaround * 2 + 1) return [];

    const targets: LiquidityTarget[] = [];
    // Restrict analysis to recent history for active targets
    const recentData = data.slice(-200);
    const recentLen = recentData.length;

    if (recentLen === 0) return [];
    
    const currentPrice = recentData[recentLen - 1].close;

    // 1. Find the highest intact swing high above current price (Buy-side liquidity)
    let buySideTarget: number | null = null;

    // Iterate backwards from the most recent valid swing point index
    for (let i = recentLen - lookaround - 1; i >= lookaround; i--) {
        if (isSwingHigh(recentData, i, lookaround)) {
            const highPrice = recentData[i].high;

            // Only consider if it's above the current market price
            if (highPrice > currentPrice) {
                let swept = false;

                // Check all subsequent candles to see if this high was ever broken
                for (let j = i + 1; j < recentLen; j++) {
                    if (recentData[j].high > highPrice) {
                        swept = true;
                        break;
                    }
                }

                // If it remains intact, we found our nearest buy-side target
                if (!swept) {
                    buySideTarget = highPrice;
                    break; // Found the most recent valid target, exit loop
                }
            }
        }
    }

    if (buySideTarget !== null) {
        targets.push({ priceLevel: buySideTarget, type: 'buy-side' });
    }

    // 2. Find the lowest intact swing low below current price (Sell-side liquidity)
    let sellSideTarget: number | null = null;

    // Iterate backwards from the most recent valid swing point index
    for (let i = recentLen - lookaround - 1; i >= lookaround; i--) {
        if (isSwingLow(recentData, i, lookaround)) {
            const lowPrice = recentData[i].low;

            // Only consider if it's below the current market price
            if (lowPrice < currentPrice) {
                let swept = false;

                // Check all subsequent candles to see if this low was ever broken
                for (let j = i + 1; j < recentLen; j++) {
                    if (recentData[j].low < lowPrice) {
                        swept = true;
                        break;
                    }
                }

                // If it remains intact, we found our nearest sell-side target
                if (!swept) {
                    sellSideTarget = lowPrice;
                    break; // Found the most recent valid target, exit loop
                }
            }
        }
    }

    if (sellSideTarget !== null) {
        targets.push({ priceLevel: sellSideTarget, type: 'sell-side' });
    }

    return targets;
}
