
'use server';

import type { HistoricalData, LiquidityEvent } from '@/lib/types';

interface LiquidityAnalysisParams {
    lookaround: number; // How many bars to look left and right to confirm a swing point
    maxLookahead: number; // How far to look for a sweep after a swing point
}

const defaultParams: LiquidityAnalysisParams = {
    lookaround: 5,
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

    for (let i = params.lookaround; i < data.length - params.maxLookahead; i++) {

        // Check for Bearish Liquidity Grab (sweeping a swing high)
        if (isSwingHigh(data, i, params.lookaround)) {
            const swingHighPrice = data[i].high;
            for (let j = i + 1; j < i + params.maxLookahead && j < data.length; j++) {
                // Check for sweep
                if (data[j].high > swingHighPrice) {
                    // Check for reversal: candle closes back below the swing high
                    if (data[j].close < swingHighPrice) {
                        events.push({
                            time: data[j].time,
                            priceLevel: swingHighPrice,
                            direction: 'bearish', // Price moved down after grabbing highs
                            type: 'grab',
                            volume: data[j].volume,
                        });
                        i = j; // Move past this event to avoid re-detecting
                        break;
                    }
                }
            }
        }

        // Check for Bullish Liquidity Grab (sweeping a swing low)
        if (isSwingLow(data, i, params.lookaround)) {
            const swingLowPrice = data[i].low;
            for (let j = i + 1; j < i + params.maxLookahead && j < data.length; j++) {
                // Check for sweep
                if (data[j].low < swingLowPrice) {
                    // Check for reversal: candle closes back above the swing low
                    if (data[j].close > swingLowPrice) {
                         events.push({
                            time: data[j].time,
                            priceLevel: swingLowPrice,
                            direction: 'bullish', // Price moved up after grabbing lows
                            type: 'grab',
                            volume: data[j].volume,
                        });
                        i = j; // Move past this event
                        break;
                    }
                }
            }
        }
    }

    return events;
}
