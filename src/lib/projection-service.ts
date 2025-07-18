
'use client';

import type { HistoricalData } from './types';
import { intervalToMs } from './utils';

/**
 * Generates a sequence of hypothetical future candlesticks based on a starting point and a specified mode.
 * The projection is grounded in the asset's recent historical volatility, price range, and volume characteristics.
 *
 * @param historicalData The recent historical data for analysis.
 * @param mode The projection mode ('upward', 'downward', 'neutral', 'random', 'frankenstein').
 * @param duration The time duration for the projection (e.g., '1d', '7d').
 * @param interval The candlestick interval (e.g., '1h', '4h').
 * @returns An array of generated HistoricalData objects representing the future projection.
 */
export function generateProjectedCandles(
  historicalData: HistoricalData[],
  mode: 'upward' | 'downward' | 'neutral' | 'random' | 'frankenstein',
  duration: '1d' | '3d' | '7d' | '1m',
  interval: string
): HistoricalData[] {
  
  const projectedCandles: HistoricalData[] = [];
  if (historicalData.length === 0) return projectedCandles;

  const lastCandle = historicalData[historicalData.length - 1];
  const intervalMs = intervalToMs(interval);

  // --- 1. Analyze recent historical data (last 7 days) ---
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const analysisStartDate = lastCandle.time - sevenDaysMs;
  const recentData = historicalData.filter(d => d.time >= analysisStartDate);

  let avgVolatility = 0;
  let recentHigh = lastCandle.high;
  let recentLow = lastCandle.low;
  
  // Create a pool of historical volumes to sample from
  const historicalVolumes = recentData.length > 0 ? recentData.map(c => c.volume) : [lastCandle.volume];

  if (recentData.length > 1) {
    let totalVolatility = 0;
    
    recentData.forEach(candle => {
      totalVolatility += candle.high - candle.low;
      if (candle.high > recentHigh) recentHigh = candle.high;
      if (candle.low < recentLow) recentLow = candle.low;
    });
    avgVolatility = totalVolatility / recentData.length;
  } else {
    // Fallback if not enough data for analysis
    avgVolatility = lastCandle.close * 0.015; // 1.5% of last price
  }
  
  // --- 2. Generate projected candles ---
  const durationMap = {
    '1d': 1 * 24 * 60 * 60 * 1000,
    '3d': 3 * 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '1m': 30 * 24 * 60 * 60 * 1000,
  };
  
  const totalDurationMs = durationMap[duration];
  const numCandlesToGenerate = Math.floor(totalDurationMs / intervalMs);

  let currentCandle = { ...lastCandle };
  
  // Define trend targets based on recent price action
  const priceRange = recentHigh - recentLow;
  const upwardTarget = recentHigh + priceRange * 0.2; // Target 20% above the recent range
  const downwardTarget = recentLow;

  for (let i = 0; i < numCandlesToGenerate; i++) {
    const nextTime = currentCandle.time + intervalMs;
    const open = currentCandle.close;

    let baseChange = 0;
    
    // Determine the current mode for Frankenstein projections
    let currentMode = mode;
    if (mode === 'frankenstein') {
      const third = numCandlesToGenerate / 3;
      if (i < third) {
        currentMode = 'upward';
      } else if (i < third * 2) {
        currentMode = 'downward';
      } else {
        currentMode = 'neutral';
      }
    }
    
    // Create a "gravitational" pull towards the target price for trend modes
    const progress = i / numCandlesToGenerate; // How far into the projection we are (0 to 1)

    switch (currentMode) {
      case 'upward':
        baseChange = (upwardTarget - open) * (progress * 0.05) * Math.random();
        break;
      case 'downward':
        const gravity = (downwardTarget - open) * (progress * 0.05) * Math.random();
        baseChange = gravity + (Math.random() - 0.5) * (avgVolatility * 0.1); // Add noise to gravity
        break;
      case 'neutral':
        // No base change, just random volatility around the opening price
        break;
      case 'random':
      default:
        baseChange = (Math.random() - 0.55) * avgVolatility * 0.4; // More significant random changes with slight downward bias
        break;
    }

    const randomVolatility = (Math.random() - 0.5) * avgVolatility;
    let close = open + baseChange + randomVolatility;

    // Ensure price doesn't go negative
    close = Math.max(0, close);

    // Make wicks based on avg volatility
    const high = Math.max(open, close) + Math.random() * (avgVolatility / 2);
    const low = Math.min(open, close) - Math.random() * (avgVolatility / 2);

    // Generate realistic volume by sampling from recent history
    const volume = historicalVolumes[Math.floor(Math.random() * historicalVolumes.length)];

    const newCandle: HistoricalData = {
      time: nextTime,
      open,
      high,
      low: Math.max(0, low), // Prevent negative low price
      close,
      volume: Math.max(0, volume), // Prevent negative volume
      isProjected: true,
    } as HistoricalData;

    projectedCandles.push(newCandle);
    currentCandle = newCandle;
  }

  return projectedCandles;
}
