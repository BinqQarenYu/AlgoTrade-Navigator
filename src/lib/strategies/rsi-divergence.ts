'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '../types';
import { calculateRSI } from '../indicators';

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

    dataWithIndicators.forEach((d, i) => {
      d.rsi = rsi[i];
    });

    // Optimize RSI Divergence lookback from O(N * L) to O(N) using monotonic deques
    // for tracking rolling minimum low and maximum high indices across window [i - lookback, i - 5).
    const minLowDeque: number[] = [];
    let minLowHead = 0;
    const maxHighDeque: number[] = [];
    let maxHighHead = 0;

    const initialEnd = params.lookback - 5;
    for (let j = 0; j < initialEnd; j++) {
      if (j < 0 || j >= data.length) continue;

      while (minLowDeque.length > minLowHead) {
        if (data[j].low < data[minLowDeque[minLowDeque.length - 1]].low) {
          minLowDeque.pop();
        } else {
          break;
        }
      }
      minLowDeque.push(j);

      while (maxHighDeque.length > maxHighHead) {
        if (data[j].high > data[maxHighDeque[maxHighDeque.length - 1]].high) {
          maxHighDeque.pop();
        } else {
          break;
        }
      }
      maxHighDeque.push(j);
    }

    for (let i = params.lookback; i < data.length; i++) {
        const d = dataWithIndicators[i];
        if (rsi[i] === null) continue;

        if (i > params.lookback) {
          const k = i - 6;
          if (k >= 0 && k < data.length) {
            while (minLowDeque.length > minLowHead) {
              if (data[k].low < data[minLowDeque[minLowDeque.length - 1]].low) {
                minLowDeque.pop();
              } else {
                break;
              }
            }
            minLowDeque.push(k);

            while (maxHighDeque.length > maxHighHead) {
              if (data[k].high > data[maxHighDeque[maxHighDeque.length - 1]].high) {
                maxHighDeque.pop();
              } else {
                break;
              }
            }
            maxHighDeque.push(k);
          }
        }

        const minAllowedIdx = i - params.lookback;
        while (minLowDeque.length > minLowHead && minLowDeque[minLowHead] < minAllowedIdx) {
          minLowHead++;
        }
        while (maxHighDeque.length > maxHighHead && maxHighDeque[maxHighHead] < minAllowedIdx) {
          maxHighHead++;
        }

        const currentPrice = data[i].low;
        const currentRsi = rsi[i]!;

        // Bullish Divergence: Price Lower Low, RSI Higher Low
        if (minLowDeque.length > minLowHead) {
            const prevLowPriceIdx = minLowDeque[minLowHead];
            if (rsi[prevLowPriceIdx] !== null && rsi[prevLowPriceIdx] !== undefined) {
                const prevLowPrice = data[prevLowPriceIdx].low;
                const prevLowRsi = rsi[prevLowPriceIdx]!;

                if (currentPrice < prevLowPrice && currentRsi > prevLowRsi && currentRsi < 40) {
                    if (params.reverse) d.sellSignal = data[i].high;
                    else d.buySignal = data[i].low;
                }
            }
        }

        // Bearish Divergence: Price Higher High, RSI Lower High
        const currentHighPrice = data[i].high;
        if (maxHighDeque.length > maxHighHead) {
            const prevHighPriceIdx = maxHighDeque[maxHighHead];
            if (rsi[prevHighPriceIdx] !== null && rsi[prevHighPriceIdx] !== undefined) {
                const prevHighPrice = data[prevHighPriceIdx].high;
                const prevHighRsi = rsi[prevHighPriceIdx]!;

                if (currentHighPrice > prevHighPrice && currentRsi < prevHighRsi && currentRsi > 60) {
                    if (params.reverse) d.buySignal = data[i].low;
                    else d.sellSignal = data[i].high;
                }
            }
        }
    }

    return dataWithIndicators;
  },
};

export default rsiDivergenceStrategy;
