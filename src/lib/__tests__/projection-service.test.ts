import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateProjectedCandles } from '../projection-service';
import type { HistoricalData } from '../types';
import { intervalToMs } from '../utils';

describe('generateProjectedCandles', () => {
  const baseTime = 1672531200000; // 2023-01-01T00:00:00.000Z

  const singleHistoricalCandle: HistoricalData = {
    time: baseTime,
    open: 100,
    high: 110,
    low: 90,
    close: 105,
    volume: 1000,
  };

  const historicalData: HistoricalData[] = [
    { time: baseTime - 2 * 3600000, open: 95, high: 105, low: 90, close: 100, volume: 800 },
    { time: baseTime - 1 * 3600000, open: 100, high: 115, low: 95, close: 110, volume: 1200 },
    { time: baseTime, open: 110, high: 120, low: 105, close: 115, volume: 1500 },
  ];

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // Predictable random values
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return an empty array if historicalData is empty', () => {
    const result = generateProjectedCandles([], 'upward', '1d', '1h');
    expect(result).toEqual([]);
  });

  it('should return the correct number of candles based on duration and interval', () => {
    // 1d duration, 1h interval -> 24 candles
    let result = generateProjectedCandles([singleHistoricalCandle], 'neutral', '1d', '1h');
    expect(result.length).toBe(24);

    // 3d duration, 4h interval -> 18 candles
    result = generateProjectedCandles([singleHistoricalCandle], 'neutral', '3d', '4h');
    expect(result.length).toBe(18);

    // 7d duration, 1d interval -> 7 candles
    result = generateProjectedCandles([singleHistoricalCandle], 'neutral', '7d', '1d');
    expect(result.length).toBe(7);
  });

  it('should ensure timestamps are consecutive based on interval', () => {
    const intervalStr = '1h';
    const intervalMs = intervalToMs(intervalStr);
    const result = generateProjectedCandles([singleHistoricalCandle], 'neutral', '1d', intervalStr);

    let expectedTime = singleHistoricalCandle.time + intervalMs;
    for (const candle of result) {
      expect(candle.time).toBe(expectedTime);
      expectedTime += intervalMs;
    }
  });

  it('should set isProjected to true on all generated candles', () => {
    const result = generateProjectedCandles([singleHistoricalCandle], 'neutral', '1d', '1h');
    for (const candle of result) {
      expect(candle.isProjected).toBe(true);
    }
  });

  it('should ensure the first projected candle opens at the last historical close', () => {
    const result = generateProjectedCandles(historicalData, 'neutral', '1d', '1h');
    expect(result[0].open).toBe(historicalData[historicalData.length - 1].close);
  });

  it('should ensure subsequent projected candles open at the previous close', () => {
    const result = generateProjectedCandles([singleHistoricalCandle], 'neutral', '1d', '1h');
    for (let i = 1; i < result.length; i++) {
      expect(result[i].open).toBe(result[i - 1].close);
    }
  });

  it('should constrain prices and volumes to non-negative values', () => {
    // Generate a normal candle but overwrite Math.random temporarily during generation
    const negativeCandle = { ...singleHistoricalCandle, close: 10, volume: -500 };

    // We will spy on Math.random and return different values to test boundaries without causing NaNs
    let count = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      count++;
      // We want gravity to be very negative:
      // gravity = (downwardTarget - open) * (progress * 0.05) * Math.random();
      // If random is 1, and target is 90 and open is 100, gravity is -10 * progress * 0.05
      // randomVolatility = (Math.random() - 0.5) * avgVolatility => if we want negative, we want random to be 0
      if (count % 3 === 0) return 0; // randomVolatility multiplier will be -0.5
      return 1; // max out gravity
    });

    // Let's force an extreme condition with massive volatility
    const result = generateProjectedCandles([negativeCandle, { ...negativeCandle, high: 1000, low: 0, close: 10}], 'downward', '1d', '1h');

    for (const candle of result) {
      expect(candle.close).toBeGreaterThanOrEqual(0);
      expect(candle.low).toBeGreaterThanOrEqual(0);
      expect(candle.high).toBeGreaterThanOrEqual(0);
      expect(candle.volume).toBeGreaterThanOrEqual(0);
      expect(Number.isNaN(candle.close)).toBe(false);
      expect(Number.isNaN(candle.low)).toBe(false);
      expect(Number.isNaN(candle.high)).toBe(false);
      expect(Number.isNaN(candle.volume)).toBe(false);
    }
  });

  describe('Modes', () => {
    it('should generate upward trajectory for upward mode', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9); // Strong positive randomness
      const result = generateProjectedCandles(historicalData, 'upward', '1d', '1h');

      const firstClose = result[0].close;
      const lastClose = result[result.length - 1].close;

      // With upward mode and strong positive random, final price should be higher
      expect(lastClose).toBeGreaterThan(firstClose);
    });

    it('should generate downward trajectory for downward mode', () => {
      // Small positive randomness for gravity calculation,
      // but 'downward' mode has downward gravity
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      const result = generateProjectedCandles(historicalData, 'downward', '1d', '1h');

      const firstClose = result[0].close;
      const lastClose = result[result.length - 1].close;

      // With downward mode, final price should be lower
      expect(lastClose).toBeLessThan(firstClose);
    });

    it('should apply frankenstein mode varying logic over time', () => {
      // Mock random to be predictable but let modes drive the logic
      vi.spyOn(Math, 'random').mockReturnValue(0.8);
      const result = generateProjectedCandles(historicalData, 'frankenstein', '3d', '1h');

      expect(result.length).toBeGreaterThan(0);

      // We know frankenstein splits numCandles into 3 phases:
      // 0 to third: upward
      // third to 2*third: downward
      // 2*third to end: neutral

      // Since randomness is 0.8, upward will increase, downward might still try to go to bottom target, neutral will stay close to open
      const firstThirdEndIndex = Math.floor(result.length / 3) - 1;
      const secondThirdEndIndex = Math.floor(result.length * 2 / 3) - 1;

      // Phase 1: upward mode
      expect(result[firstThirdEndIndex].close).toBeGreaterThan(result[0].open);
    });
  });

  describe('Volatility and Volume Sampling', () => {
    it('should use fallback volatility when only 1 historical candle is provided', () => {
      // Fallback is avgVolatility = lastCandle.close * 0.015
      // Expected fallback avgVolatility = 105 * 0.015 = 1.575
      const result = generateProjectedCandles([singleHistoricalCandle], 'neutral', '1d', '1h');

      // For neutral, close = open + baseChange (which is 0) + randomVolatility
      // randomVolatility = (Math.random() - 0.5) * avgVolatility
      // Math.random() is mocked to 0.5, so randomVolatility = 0
      // close should be open + 0 = open
      expect(result[0].close).toBeCloseTo(singleHistoricalCandle.close);

      // For neutral, high = Math.max(open, close) + Math.random() * (avgVolatility / 2)
      // Math.random() is 0.5, avgVolatility = 1.575
      // high = 105 + 0.5 * (1.575 / 2) = 105 + 0.39375 = 105.39375
      expect(result[0].high).toBeCloseTo(105.39375);
    });

    it('should calculate volatility from multiple historical candles', () => {
      // historicalData has 3 candles
      // c1: 95->100 (high-low: 105-90=15)
      // c2: 100->110 (high-low: 115-95=20)
      // c3: 110->115 (high-low: 120-105=15)
      // total volatility = 15 + 20 + 15 = 50
      // avgVolatility = 50 / 3 = 16.666...

      const result = generateProjectedCandles(historicalData, 'neutral', '1d', '1h');

      // Math.random() = 0.5
      // baseChange = 0 (neutral)
      // randomVolatility = 0
      // close = 115

      // high = 115 + 0.5 * (16.666... / 2) = 115 + 4.1666... = 119.1666...
      expect(result[0].high).toBeCloseTo(119.166666);
    });

    it('should sample volume from historical volumes', () => {
      // Only 3 historical candles with volumes: 800, 1200, 1500
      // Using deterministic Math.random() = 0.5
      // Math.floor(0.5 * 3) = 1 -> should pick index 1 which is 1200

      const result = generateProjectedCandles(historicalData, 'neutral', '1d', '1h');

      for (const candle of result) {
        expect(candle.volume).toBe(1200);
      }
    });
  });
});
