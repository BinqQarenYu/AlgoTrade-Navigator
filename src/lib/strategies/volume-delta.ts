'use client';

import type { HistoricalData, Strategy, DisciplineParams } from '../types';

export interface VolumeDeltaParams {
  pocLookback: number;
  deltaLookback: number;
  pocProximityPercent: number;
  discipline: DisciplineParams;
}

export const defaultVolumeDeltaParams: VolumeDeltaParams = {
  pocLookback: 200,
  deltaLookback: 5,
  pocProximityPercent: 0.005,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};


// Calculates a simplified volume delta for each candle
function calculateVolumeDelta(data: HistoricalData[], deltaLookback: number): { volumeDelta: number[], cumulativeVolumeDelta: number[] } {
    const volumeDelta = data.map(d => {
        if (d.close > d.open) return d.volume; // Buying pressure
        if (d.close < d.open) return -d.volume; // Selling pressure
        return 0;
    });

    const cumulativeVolumeDelta: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < deltaLookback - 1) {
            cumulativeVolumeDelta.push(null);
        } else {
            const sum = volumeDelta.slice(i - deltaLookback + 1, i + 1).reduce((a, b) => a + b, 0);
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
    
    if (priceRange === 0) return relevantData[0]?.low || 0;

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

const volumeDeltaStrategy: Strategy = {
    id: 'volume-delta',
    name: 'Volume Delta Confirmation',
    description: 'A strategy that confirms trades by analyzing buying/selling pressure (delta) at significant price levels (POC).',
    async calculate(data: HistoricalData[], userParams: Partial<VolumeDeltaParams> = {}): Promise<HistoricalData[]> {
        const params = { ...defaultVolumeDeltaParams, ...userParams };
        const dataWithIndicators = JSON.parse(JSON.stringify(data));
        if (data.length < params.pocLookback) return dataWithIndicators;

        const { volumeDelta, cumulativeVolumeDelta } = calculateVolumeDelta(data, params.deltaLookback);

        for (let i = params.pocLookback; i < data.length; i++) {
            dataWithIndicators[i].volumeDelta = volumeDelta[i];
            dataWithIndicators[i].cumulativeVolumeDelta = cumulativeVolumeDelta[i];

            const poc = findPOC(data, i, params.pocLookback);
            dataWithIndicators[i].poc = poc;
            
            if (!poc || !cumulativeVolumeDelta[i - 1] || !cumulativeVolumeDelta[i]) continue;
            
            const currentCandle = data[i];
            const prevCumulativeDelta = cumulativeVolumeDelta[i - 1]!;
            const currentCumulativeDelta = cumulativeVolumeDelta[i]!;

            // LONG condition: Price tests POC from above and cumulative delta flips positive
            if (currentCandle.low <= poc * (1 + params.pocProximityPercent) && currentCandle.close > poc && prevCumulativeDelta <= 0 && currentCumulativeDelta > 0 && currentCandle.close > currentCandle.open) {
                dataWithIndicators[i].bullish_event = true;
            }
            
            // SHORT condition: Price tests POC from below and cumulative delta flips negative
            if (currentCandle.high >= poc * (1 - params.pocProximityPercent) && currentCandle.close < poc && prevCumulativeDelta >= 0 && currentCumulativeDelta < 0 && currentCandle.close < currentCandle.open) {
                 dataWithIndicators[i].bearish_event = true;
            }
        }
        return dataWithIndicators;
    }
}

export default volumeDeltaStrategy;
