
'use client';

import type { HistoricalData } from './types';
import { intervalToMs } from './utils';

/**
 * Generates a sequence of hypothetical future candlesticks based on a starting point and a specified mode.
 *
 * @param historicalData The last 7 days of historical data for analysis.
 * @param mode The projection mode ('upward', 'downward', 'neutral', 'random').
 * @param duration The time duration for the projection (e.g., '1d', '7d').
 * @param interval The candlestick interval (e.g., '1h', '4h').
 * @returns An array of generated HistoricalData objects representing the future projection.
 */
export function generateProjectedCandles(
  historicalData: HistoricalData[],
  mode: 'upward' | 'downward' | 'neutral' | 'random',
  duration: '1d' | '3d' | '7d' | '1m',
  interval: string
): HistoricalData[] {
  
  const projectedCandles: HistoricalData[] = [];
  if (historicalData.length === 0) return projectedCandles;

  const lastCandle = historicalData[historicalData.length - 1];
  const intervalMs = intervalToMs(interval);

  // --- Analyze recent data ---
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const analysisStartDate = lastCandle.time - sevenDaysMs;
  const recentData = historicalData.filter(d => d.time >= analysisStartDate);

  let avgVolatility = 0;
  let biggestDrops: number[] = [];

  if (recentData.length > 1) {
    let totalVolatility = 0;
    for (let i = 1; i < recentData.length; i++) {
        const range = recentData[i].high - recentData[i].low;
        totalVolatility += range;
        
        const drop = recentData[i-1].open - recentData[i].close;
        if (drop > 0) {
            biggestDrops.push(drop);
        }
    }
    avgVolatility = totalVolatility / recentData.length;
    biggestDrops.sort((a,b) => b-a);
  } else {
    // Fallback if not enough data
    avgVolatility = lastCandle.close * 0.015;
  }
  
  // --- Generate projected candles ---
  const durationMap = {
    '1d': 1 * 24 * 60 * 60 * 1000,
    '3d': 3 * 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '1m': 30 * 24 * 60 * 60 * 1000, // Approximate 1 month
  };
  
  const totalDurationMs = durationMap[duration];
  const numCandlesToGenerate = Math.floor(totalDurationMs / intervalMs);

  let currentCandle = { ...lastCandle };

  for (let i = 0; i < numCandlesToGenerate; i++) {
    const nextTime = currentCandle.time + intervalMs;
    const open = currentCandle.close;

    let change = (Math.random() - 0.5) * avgVolatility * 1.5;

    switch (mode) {
      case 'upward':
        change += Math.random() * avgVolatility * 0.75;
        break;
      case 'downward':
        change -= Math.random() * avgVolatility * 0.75; 
        // Occasionally add a big drop based on historical data
        if (biggestDrops.length > 0 && Math.random() < 0.1) { // 10% chance
            const dropIndex = Math.floor(Math.random() * Math.min(biggestDrops.length, 5));
            change -= biggestDrops[dropIndex];
        }
        break;
      case 'neutral':
        change *= 0.5;
        break;
      case 'random':
      default:
        break;
    }

    const close = open + change;
    const high = Math.max(open, close) + Math.random() * (avgVolatility / 2);
    const low = Math.min(open, close) - Math.random() * (avgVolatility / 2);
    const volume = currentCandle.volume * (0.95 - Math.random() * 0.1);

    const newCandle: HistoricalData = {
      time: nextTime,
      open,
      high,
      low,
      close,
      volume: Math.max(0, volume),
      isProjected: true, // Custom flag to identify these candles
    } as HistoricalData;

    projectedCandles.push(newCandle);
    currentCandle = newCandle;
  }

  return projectedCandles;
}
