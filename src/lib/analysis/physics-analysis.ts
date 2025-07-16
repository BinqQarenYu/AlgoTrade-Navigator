
'use server';

import type { HistoricalData, OrderBookData } from '@/lib/types';

/**
 * Calculates the pressure metric for each candle in a dataset.
 * Pressure is defined as the candle's volume divided by the total order book depth at that time.
 * @param data The historical k-line data.
 * @param totalDepth The total depth (sum of bids and asks) from the order book.
 * @returns The historical data array with the `pressure_depth` property added.
 */
export async function calculatePressure(
    data: HistoricalData[],
    totalDepth: number
): Promise<HistoricalData[]> {
    if (totalDepth === 0) {
        // Avoid division by zero, return data without pressure
        return data.map(d => ({ ...d, pressure_depth: 0 }));
    }

    return data.map(candle => {
        const pressure = candle.volume / totalDepth;
        return {
            ...candle,
            pressure_depth: isNaN(pressure) ? 0 : pressure,
        };
    });
}

/**
 * Calculates the market's "stiffness" for each candle.
 * Stiffness is the price range (High - Low) divided by the volume.
 * A lower value means high stiffness (a lot of volume was needed to move the price).
 * @param data The historical k-line data.
 * @returns The historical data array with the `k1_stiffness_range` property added.
 */
export async function calculateStiffness(
    data: HistoricalData[]
): Promise<HistoricalData[]> {
    return data.map(candle => {
        const range = candle.high - candle.low;
        // Avoid division by zero. If volume is 0 but range is not, stiffness is effectively infinite.
        // We'll cap it at a high number for visualization purposes. If range is 0, stiffness is 0.
        const stiffness = candle.volume > 0 ? range / candle.volume : (range > 0 ? 1e9 : 0);
        return {
            ...candle,
            k1_stiffness_range: isNaN(stiffness) ? 0 : stiffness,
        };
    });
}

/**
 * Calculates the depth imbalance ratio from the order book data.
 * The ratio is (Total Bid Value - Total Ask Value) / (Total Bid Value + Total Ask Value).
 * A positive value indicates buy pressure, negative indicates sell pressure.
 * @param orderBook The live order book data.
 * @returns The calculated imbalance ratio, from -1 to 1.
 */
export async function calculateDepthImbalance(
    orderBook: OrderBookData
): Promise<number> {
    const totalBidValue = orderBook.bids.reduce((acc, bid) => acc + (bid.price * bid.quantity), 0);
    const totalAskValue = orderBook.asks.reduce((acc, ask) => acc + (ask.price * ask.quantity), 0);
    const totalValue = totalBidValue + totalAskValue;

    if (totalValue === 0) {
        return 0;
    }

    const imbalance = (totalBidValue - totalAskValue) / totalValue;
    return isNaN(imbalance) ? 0 : imbalance;
}
