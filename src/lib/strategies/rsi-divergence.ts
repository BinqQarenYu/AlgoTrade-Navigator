'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateRSI } from '@/lib/indicators';

export interface RsiDivergenceParams {
  period: number;
  lookback: number;
  reverse?: boolean;
  discipline: DisciplineParams;
}

export const defaultRsiDivergenceParams: RsiDivergenceParams = {
  period: 14,
  lookback: 60,
  reverse: false,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const rsiDivergenceStrategy: Strategy = {
  id: 'rsi-divergence',
  name: 'RSI Divergence',
  description: 'A strategy that identifies bullish and bearish divergences between price and RSI.',
  async calculate(data: HistoricalData[], params: RsiDivergenceParams = defaultRsiDivergenceParams): Promise<HistoricalData[]> {
    const dataWithIndicators = data.map(d => ({ ...d }));
    if (data.length < params.period + params.lookback) return dataWithIndicators;
    
    const closePrices = data.map(d => d.close);
    const rsi = calculateRSI(closePrices, params.period);

    for (let i = params.lookback; i < data.length; i++) {
        const d = dataWithIndicators[i];
        d.rsi = rsi[i];
        if (rsi[i] === null) continue;

        const currentPrice = data[i].low;
        const currentRsi = rsi[i]!;

        // Bullish Divergence: Price Lower Low, RSI Higher Low
        let prevLowPriceIdx = -1;
        let minPrice = Infinity;
        for (let j = i - params.lookback; j < i - 5; j++) {
            if (data[j].low < minPrice) {
                minPrice = data[j].low;
                prevLowPriceIdx = j;
            }
        }

        if (prevLowPriceIdx !== -1 && rsi[prevLowPriceIdx] !== null) {
            const prevLowPrice = data[prevLowPriceIdx].low;
            const prevLowRsi = rsi[prevLowPriceIdx]!;

            if (currentPrice < prevLowPrice && currentRsi > prevLowRsi && currentRsi < 40) {
                if (params.reverse) d.sellSignal = data[i].high;
                else d.buySignal = data[i].low;
            }
        }

        // Bearish Divergence: Price Higher High, RSI Lower High
        const currentHighPrice = data[i].high;
        let prevHighPriceIdx = -1;
        let maxPrice = -Infinity;
        for (let j = i - params.lookback; j < i - 5; j++) {
            if (data[j].high > maxPrice) {
                maxPrice = data[j].high;
                prevHighPriceIdx = j;
            }
        }

        if (prevHighPriceIdx !== -1 && rsi[prevHighPriceIdx] !== null) {
            const prevHighPrice = data[prevHighPriceIdx].high;
            const prevHighRsi = rsi[prevHighPriceIdx]!;

            if (currentHighPrice > prevHighPrice && currentRsi < prevHighRsi && currentRsi > 60) {
                if (params.reverse) d.buySignal = data[i].low;
                else d.sellSignal = data[i].high;
            }
        }
    }

    return dataWithIndicators;
  },
};

export default rsiDivergenceStrategy;
