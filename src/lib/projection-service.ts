
'use client';

import type { HistoricalData } from './types';
import { intervalToMs } from './utils';

/**
 * Generates a sequence of hypothetical future candlesticks based on a starting point and a specified mode.
 * The projection is grounded in the asset's recent historical volatility and price range.
 *
 * @param historicalData The recent historical data for analysis.
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

  // --- 1. Analyze recent historical data (last 7 days) ---
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const analysisStartDate = lastCandle.time - sevenDaysMs;
  const recentData = historicalData.filter(d => d.time >= analysisStartDate);

  let avgVolatility = 0;
  let recentHigh = lastCandle.high;
  let recentLow = lastCandle.low;

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
  
  const trendTargetPrice = mode === 'upward' 
      ? recentHigh * 1.02 // Target 2% above recent high
      : recentLow * 0.98; // Target 2% below recent low

  for (let i = 0; i < numCandlesToGenerate; i++) {
    const nextTime = currentCandle.time + intervalMs;
    const open = currentCandle.close;

    let baseChange = 0;
    
    // Create a "gravitational" pull towards the target price for trend modes
    const progress = i / numCandlesToGenerate; // How far into the projection we are (0 to 1)
    const distanceToTarget = trendTargetPrice - open;
    const gravitationalPull = (distanceToTarget / (numCandlesToGenerate - i)) * Math.random();

    switch (mode) {
      case 'upward':
        baseChange = gravitationalPull;
        break;
      case 'downward':
        baseChange = gravitationalPull;
        break;
      case 'neutral':
        // No base change, just random volatility
        break;
      case 'random':
      default:
        baseChange = (Math.random() - 0.5) * avgVolatility * 0.3; // More significant random changes
        break;
    }

    const randomVolatility = (Math.random() - 0.5) * avgVolatility;
    let close = open + baseChange + randomVolatility;

    // Ensure price doesn't go negative
    close = Math.max(0, close);

    // Make wicks based on avg volatility
    const high = Math.max(open, close) + Math.random() * (avgVolatility / 2);
    const low = Math.min(open, close) - Math.random() * (avgVolatility / 2);

    const volume = currentCandle.volume * (1.05 - Math.random() * 0.1); // +/- 5% volume change

    const newCandle: HistoricalData = {
      time: nextTime,
      open,
      high,
      low: Math.max(0, low), // Prevent negative low price
      close,
      volume: Math.max(0, volume),
      isProjected: true,
    } as HistoricalData;

    projectedCandles.push(newCandle);
    currentCandle = newCandle;
  }

  return projectedCandles;
}
