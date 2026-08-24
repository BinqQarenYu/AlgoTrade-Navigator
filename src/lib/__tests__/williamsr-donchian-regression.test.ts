import { describe, it, expect } from 'vitest';
import { calculateWilliamsR, calculateDonchianChannels } from '../indicators';
import type { HistoricalData } from '../types';

describe('Williams %R and Donchian Channels Regression & Optimization Tests', () => {
  const dummyData: HistoricalData[] = Array.from({ length: 100 }, (_, i) => ({
    timestamp: i * 60000,
    open: 100 + (i % 10),
    high: 105 + (i % 10),
    low: 95 - (i % 5),
    close: 101 + (i % 7),
    volume: 1000 + i * 10,
  }));

  it('calculateWilliamsR should match expected values and handle bounds', () => {
    const period = 14;
    const result = calculateWilliamsR(dummyData, period);

    expect(result.length).toBe(dummyData.length);
    // Initial period - 1 items should be null
    for (let i = 0; i < period - 1; i++) {
      expect(result[i]).toBeNull();
    }

    // Check valid values after period
    for (let i = period - 1; i < dummyData.length; i++) {
      const slice = dummyData.slice(i - period + 1, i + 1);
      const maxHigh = Math.max(...slice.map((d) => d.high));
      const minLow = Math.min(...slice.map((d) => d.low));
      const expected = ((maxHigh - dummyData[i].close) / (maxHigh - minLow)) * -100;

      expect(result[i]).toBeCloseTo(expected, 5);
    }
  });

  it('calculateDonchianChannels should match expected values', () => {
    const period = 20;
    const result = calculateDonchianChannels(dummyData, period);

    expect(result.upper.length).toBe(dummyData.length);
    expect(result.lower.length).toBe(dummyData.length);
    expect(result.middle.length).toBe(dummyData.length);

    for (let i = 0; i < period - 1; i++) {
      expect(result.upper[i]).toBeNull();
      expect(result.lower[i]).toBeNull();
      expect(result.middle[i]).toBeNull();
    }

    for (let i = period - 1; i < dummyData.length; i++) {
      const slice = dummyData.slice(i - period + 1, i + 1);
      const expectedUpper = Math.max(...slice.map((d) => d.high));
      const expectedLower = Math.min(...slice.map((d) => d.low));
      const expectedMiddle = (expectedUpper + expectedLower) / 2;

      expect(result.upper[i]).toBe(expectedUpper);
      expect(result.lower[i]).toBe(expectedLower);
      expect(result.middle[i]).toBe(expectedMiddle);
    }
  });
});
