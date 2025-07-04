
'use client';

import type { HistoricalData } from '../types';

const POC_LOOKBACK = 200; // Lookback period to determine the Point of Control
const DELTA_LOOKBACK = 5; // Lookback for cumulative delta calculation
const POC_PROXIMITY_PERCENT = 0.005; // How close price must get to POC (0.5%)

// Calculates a simplified volume delta for each candle
function calculateVolumeDelta(data: HistoricalData[]): { volumeDelta: number[], cumulativeVolumeDelta: number[] } {
    const volumeDelta = data.map(d => {
        if (d.close > d.open) return d.volume; // Buying pressure
        if (d.close < d.open) return -d.volume; // Selling pressure
        return 0;
    });

    const cumulativeVolumeDelta: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < DELTA_LOOKBACK - 1) {
            cumulativeVolumeDelta.push(null);
        } else {
            const sum = volumeDelta.slice(i - DELTA_LOOKBACK + 1, i + 1).reduce((a, b) => a + b, 0);
            cumulativeVolumeDelta.push(sum);
        }
    }

    return { volumeDelta, cumulativeVolumeDelta: cumulativeVolumeDelta as number[] };
}

// Finds the Point of Control (price level with the highest volume) in a lookback period
function findPOC(data: HistoricalData[], endIndex: number, lookback: number): number {
    const startIndex = Math.max(0, endIndex - lookback + 1);
    const relevantData = data.slice(startIndex, endIndex + 1);

    const volumeAtPrice: { [price: string]: number } = {};
    let maxVolume = 0;
    let poc = 0;
    
    if(relevantData.length === 0) return 0;

    const minPrice = Math.min(...relevantData.map(d => d.low));
    const maxPrice = Math.max(...relevantData.map(d => d.high));
    const priceRange = maxPrice - minPrice;
    
    if (priceRange === 0) return relevantData[0].close;

    // Adjust bin size based on price magnitude
    let binSize = 0.01; // for prices < $1
    if (minPrice > 1000) binSize = 10;
    else if (minPrice > 100) binSize = 1;
    else if (minPrice > 1) binSize = 0.1;


    relevantData.forEach(d => {
        const priceBin = (Math.round(d.close / binSize) * binSize).toFixed(8);
        volumeAtPrice[priceBin] = (volumeAtPrice[priceBin] || 0) + d.volume;
        if (volumeAtPrice[priceBin] > maxVolume) {
            maxVolume = volumeAtPrice[priceBin];
            poc = parseFloat(priceBin);
        }
    });

    return poc || relevantData[relevantData.length - 1]?.close || 0;
}


export async function calculateVolumeDeltaSignals(data: HistoricalData[], calculateSignals: boolean = true): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    if (data.length < POC_LOOKBACK) return dataWithIndicators;

    const { volumeDelta, cumulativeVolumeDelta } = calculateVolumeDelta(data);

    for (let i = POC_LOOKBACK; i < data.length; i++) {
        dataWithIndicators[i].volumeDelta = volumeDelta[i];
        dataWithIndicators[i].cumulativeVolumeDelta = cumulativeVolumeDelta[i];

        const poc = findPOC(data, i, POC_LOOKBACK);
        dataWithIndicators[i].poc = poc;
        
        if (!calculateSignals) continue;
        
        if (!poc || !cumulativeVolumeDelta[i - 1] || !cumulativeVolumeDelta[i]) continue;
        
        const currentCandle = data[i];
        const prevCumulativeDelta = cumulativeVolumeDelta[i - 1]!;
        const currentCumulativeDelta = cumulativeVolumeDelta[i]!;

        // LONG condition: Price tests POC from above and cumulative delta flips positive
        if (currentCandle.low <= poc * (1 + POC_PROXIMITY_PERCENT) && currentCandle.close > poc) {
            if (prevCumulativeDelta <= 0 && currentCumulativeDelta > 0) {
                 // Additional confirmation: the candle that signals is bullish
                if (currentCandle.close > currentCandle.open) {
                    dataWithIndicators[i].buySignal = currentCandle.low;
                }
            }
        }
        
        // SHORT condition: Price tests POC from below and cumulative delta flips negative
        if (currentCandle.high >= poc * (1 - POC_PROXIMITY_PERCENT) && currentCandle.close < poc) {
            if (prevCumulativeDelta >= 0 && currentCumulativeDelta < 0) {
                // Additional confirmation: the candle that signals is bearish
                if (currentCandle.close < currentCandle.open) {
                     dataWithIndicators[i].sellSignal = currentCandle.high;
                }
            }
        }
    }

    return dataWithIndicators;
}
