
'use client';

import type { HistoricalData, Strategy, DisciplineParams } from '../types';

export interface OrderFlowScalpParams {
  pocLookback: number;
  deltaLookback: number;
  pocProximityPercent: number;
  reverse?: boolean;
  discipline: DisciplineParams;
}

export const defaultOrderFlowScalpParams: OrderFlowScalpParams = {
  pocLookback: 200,
  deltaLookback: 5,
  pocProximityPercent: 0.005, // 0.5%
  reverse: false,
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
    
    if(relevantData.length === 0) return 0;

    const volumeAtPrice: { [price: string]: number } = {};
    let maxVolume = 0;
    let poc = 0;

    const minPrice = Math.min(...relevantData.map(d => d.low));
    const maxPrice = Math.max(...relevantData.map(d => d.high));
    const priceRange = maxPrice - minPrice;

    if (priceRange === 0) return relevantData[relevantData.length - 1]?.close || 0;

    // Dynamically determine bin size based on price magnitude of the range
    let binSize = 0.000001; // Default for very small price ranges
    if (priceRange > 1000) binSize = 10;
    else if (priceRange > 100) binSize = 1;
    else if (priceRange > 10) binSize = 0.5;
    else if (priceRange > 1) binSize = 0.1;
    else if (priceRange > 0.1) binSize = 0.01;
    else if (priceRange > 0.01) binSize = 0.001;

    relevantData.forEach(d => {
        // Use a representative price for the candle, like the close
        const priceBinKey = String(Math.round(d.close / binSize) * binSize);
        volumeAtPrice[priceBinKey] = (volumeAtPrice[priceBinKey] || 0) + d.volume;

        if (volumeAtPrice[priceBinKey] > maxVolume) {
            maxVolume = volumeAtPrice[priceBinKey];
            poc = parseFloat(priceBinKey);
        }
    });

    return poc || (relevantData.length > 0 ? relevantData[relevantData.length - 1].close : 0);
}


const orderFlowScalpStrategy: Strategy = {
    id: 'order-flow-scalp',
    name: 'Order Flow Scalp',
    description: 'Simulates "tape reading" by confirming trades with buying/selling pressure (delta) at significant volume levels (POC).',
    async calculate(data: HistoricalData[], params: OrderFlowScalpParams = defaultOrderFlowScalpParams): Promise<HistoricalData[]> {
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

            // LONG condition (Absorption): Price tests POC from above and cumulative delta flips positive
            const standardBuy = currentCandle.low <= poc * (1 + params.pocProximityPercent) && currentCandle.close > poc && prevCumulativeDelta <= 0 && currentCumulativeDelta > 0 && currentCandle.close > currentCandle.open;
            
            // SHORT condition (Exhaustion): Price tests POC from below and cumulative delta flips negative
            const standardSell = currentCandle.high >= poc * (1 - params.pocProximityPercent) && currentCandle.close < poc && prevCumulativeDelta >= 0 && currentCumulativeDelta < 0 && currentCandle.close < currentCandle.open;

            if (params.reverse) {
                if (standardBuy) dataWithIndicators[i].sellSignal = currentCandle.high;
                if (standardSell) dataWithIndicators[i].buySignal = currentCandle.low;
            } else {
                if (standardBuy) dataWithIndicators[i].buySignal = currentCandle.low;
                if (standardSell) dataWithIndicators[i].sellSignal = currentCandle.high;
            }
        }
        return dataWithIndicators;
    }
}

export default orderFlowScalpStrategy;
