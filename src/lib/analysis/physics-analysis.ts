
'use server';

import type { HistoricalData } from '@/lib/types';

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
