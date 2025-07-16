
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


// --- NEW FUNCTIONS ---

// Helper function for simple moving average, as it's needed for BPI
const calculateSMA = (data: number[], period: number): (number | null)[] => {
  if (data.length < period) return Array(data.length).fill(null);
  
  const sma: (number | null)[] = Array(period - 1).fill(null);
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    sma.push(sum / period);
  }
  return sma;
};

/**
 * Calculates the Burst Potential Index (BPI).
 * BPI is defined as the average stiffness over a period divided by the current stiffness.
 * A high BPI indicates a potential for a sharp price movement ("burst").
 * @param data The historical data, which MUST already contain `k1_stiffness_range`.
 * @param period The lookback period for calculating the average stiffness.
 * @returns The historical data array with the `burst_potential_index_N` property added.
 */
export async function calculateBPI(
    data: HistoricalData[],
    period: number = 20
): Promise<HistoricalData[]> {
    const stiffnessValues = data.map(d => d.k1_stiffness_range || 0);
    const avgStiffness = calculateSMA(stiffnessValues, period);

    return data.map((candle, index) => {
        const currentStiffness = candle.k1_stiffness_range;
        const avg = avgStiffness[index];

        if (currentStiffness === null || currentStiffness === undefined || avg === null || avg === undefined || currentStiffness === 0) {
            return { ...candle, burst_potential_index_N: 0 };
        }

        const bpi = avg / currentStiffness;
        return {
            ...candle,
            burst_potential_index_N: isNaN(bpi) ? 0 : bpi,
        };
    });
}

/**
 * Calculates a simple sentiment score for each candle.
 * The score is the ratio of net upward movement to total movement over a lookback period.
 * Ranges from -1 (purely bearish) to +1 (purely bullish).
 * @param data The historical k-line data.
 * @param period The lookback period for the sentiment calculation.
 * @returns The historical data array with the `sentimentScore` property added.
 */
export async function calculateSentiment(
    data: HistoricalData[],
    period: number = 20
): Promise<HistoricalData[]> {
    const scores: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            scores.push(null);
            continue;
        }

        const slice = data.slice(i - period + 1, i + 1);
        let netMovement = 0;
        let totalMovement = 0;

        slice.forEach(candle => {
            const move = candle.close - candle.open;
            netMovement += move;
            totalMovement += Math.abs(move);
        });

        const score = totalMovement > 0 ? netMovement / totalMovement : 0;
        scores.push(score);
    }
    
    return data.map((candle, index) => ({
        ...candle,
        sentimentScore: scores[index],
    }));
}
