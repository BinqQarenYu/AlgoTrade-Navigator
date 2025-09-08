
'use client';

import type { HistoricalData, Strategy, DisciplineParams } from '../types';
import { calculateEMA } from '../indicators';

export interface OldHyperPFFParams {
    peakLookaround: number;
    swingLookaround: number;
    emaShortPeriod: number;
    emaLongPeriod: number;
    fibLevel1: number;
    fibLevel2: number;
    maxLookahead: number; // This is the repainting parameter
    reverse?: boolean;
    discipline: DisciplineParams;
}

export const defaultOldHyperPFFParams: OldHyperPFFParams = {
    peakLookaround: 5,
    swingLookaround: 3,
    emaShortPeriod: 13,
    emaLongPeriod: 50,
    fibLevel1: 0.5,
    fibLevel2: 0.618,
    maxLookahead: 100,
    reverse: false,
    discipline: {
        enableDiscipline: true,
        maxConsecutiveLosses: 4,
        cooldownPeriodMinutes: 30,
        dailyDrawdownLimit: 15,
        onFailure: 'Cooldown',
    },
};

function findLastSwingLowBefore(swingLows: number[], index: number) {
    const relevant = swingLows.filter(sw => sw < index);
    return relevant.length > 0 ? relevant[relevant.length - 1] : null;
}

function findLastSwingHighBefore(swingHighs: number[], index: number) {
    const relevant = swingHighs.filter(sw => sw < index);
    return relevant.length > 0 ? relevant[relevant.length - 1] : null;
}

function findSwingLows(data: HistoricalData[], lookaround: number): number[] {
    const swingLows: number[] = [];
    for (let i = lookaround; i < data.length - lookaround; i++) {
        let isSwingLow = true;
        for (let j = 1; j <= lookaround; j++) {
            if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) {
                isSwingLow = false;
                break;
            }
        }
        if (isSwingLow) swingLows.push(i);
    }
    return swingLows;
}

function findSwingHighs(data: HistoricalData[], lookaround: number): number[] {
    const swingHighs: number[] = [];
    for (let i = lookaround; i < data.length - lookaround; i++) {
        let isSwingHigh = true;
        for (let j = 1; j <= lookaround; j++) {
            if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) {
                isSwingHigh = false;
                break;
            }
        }
        if (isSwingHigh) swingHighs.push(i);
    }
    return swingHighs;
}

const hyperPeakFormationOldStrategy: Strategy = {
    id: 'hyper-peak-formation-old',
    name: 'Hyper Peak Formation (Old)',
    description: 'The original, repainting version of the strategy that looks into the future to find signals. Useful for educational purposes.',
    async calculate(data: HistoricalData[], params: OldHyperPFFParams = defaultOldHyperPFFParams): Promise<HistoricalData[]> {
        const dataWithIndicators = JSON.parse(JSON.stringify(data));
        const { peakLookaround, swingLookaround, emaShortPeriod, emaLongPeriod, fibLevel1, fibLevel2, maxLookahead, reverse } = params;

        if (data.length < emaLongPeriod) return dataWithIndicators;

        const closePrices = data.map(d => d.close);
        const emaShort = calculateEMA(closePrices, emaShortPeriod);
        const emaLong = calculateEMA(closePrices, emaLongPeriod);
        
        dataWithIndicators.forEach((d: HistoricalData, i: number) => {
            d.ema_short = emaShort[i];
            d.ema_long = emaLong[i];
        });

        const swingLows = findSwingLows(data, swingLookaround);
        const swingHighs = findSwingHighs(data, swingLookaround);

        for (let i = peakLookaround; i < data.length - peakLookaround; i++) {
            // --- SHORT (PFH) ---
            let isPFH = true;
            for (let j = 1; j <= peakLookaround; j++) {
                if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) { isPFH = false; break; }
            }

            if (isPFH) {
                const peakHigh = data[i].high;
                const relevantSwingLowIndex = findLastSwingLowBefore(swingLows, i);
                if (relevantSwingLowIndex !== null) {
                    for (let k = i + 1; k < Math.min(i + maxLookahead, data.length); k++) {
                        if (!emaShort[k-1] || !emaLong[k-1] || !emaShort[k] || !emaLong[k]) continue;
                        if (emaShort[k-1]! >= emaLong[k-1]! && emaShort[k]! < emaLong[k]! && data[k].close < data[relevantSwingLowIndex].low) {
                            // ... rest of the logic
                        }
                    }
                }
            }

            // --- LONG (PFL) ---
            let isPFL = true;
            for (let j = 1; j <= peakLookaround; j++) {
                if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) { isPFL = false; break; }
            }

            if (isPFL) {
                const peakLow = data[i].low;
                const relevantSwingHighIndex = findLastSwingHighBefore(swingHighs, i);
                if (relevantSwingHighIndex !== null) {
                    for (let k = i + 1; k < Math.min(i + maxLookahead, data.length); k++) {
                         if (!emaShort[k-1] || !emaLong[k-1] || !emaShort[k] || !emaLong[k]) continue;
                         if (emaShort[k-1]! <= emaLong[k-1]! && emaShort[k]! > emaLong[k]! && data[k].close > data[relevantSwingHighIndex].high) {
                            // ... rest of the logic
                         }
                    }
                }
            }
        }
        return dataWithIndicators;
    }
};

export default hyperPeakFormationOldStrategy;
