
'use client';

import type { HistoricalData } from './types';
import { intervalToMs } from './utils';

/**
 * Generates a sequence of hypothetical future candlesticks based on a starting point and a specified mode.
 *
 * @param lastCandle The last real candlestick to project from.
 * @param mode The projection mode ('upward', 'downward', 'neutral', 'random').
 * @param duration The time duration for the projection (e.g., '1d', '7d').
 * @param interval The candlestick interval (e.g., '1h', '4h').
 * @returns An array of generated HistoricalData objects representing the future projection.
 */
export function generateProjectedCandles(
  lastCandle: HistoricalData,
  mode: 'upward' | 'downward' | 'neutral' | 'random',
  duration: '1d' | '3d' | '7d' | '1m',
  interval: string
): HistoricalData[] {
  
  const projectedCandles: HistoricalData[] = [];
  const intervalMs = intervalToMs(interval);

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

    // Define volatility based on a percentage of the current price
    const volatility = open * 0.015; // 1.5% volatility per candle interval

    let change = (Math.random() - 0.5) * volatility * 2; // Base random change

    // Apply bias based on mode
    switch (mode) {
      case 'upward':
        change += Math.random() * volatility * 0.75; // Add a positive bias
        break;
      case 'downward':
        change -= Math.random() * volatility * 0.75; // Add a negative bias
        break;
      case 'neutral':
        change *= 0.5; // Reduce volatility for sideways movement
        break;
      case 'random':
      default:
        // No additional bias
        break;
    }

    const close = open + change;
    const high = Math.max(open, close) + Math.random() * (volatility / 2);
    const low = Math.min(open, close) - Math.random() * (volatility / 2);
    
    // Simulate some volume, decreasing over the projection
    const volume = currentCandle.volume * (0.95 - Math.random() * 0.1);

    const newCandle: HistoricalData = {
      time: nextTime,
      open,
      high,
      low,
      close,
      volume: Math.max(0, volume), // Ensure volume isn't negative
    };

    projectedCandles.push(newCandle);
    currentCandle = newCandle;
  }

  return projectedCandles;
}
