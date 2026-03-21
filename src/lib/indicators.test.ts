import { describe, it, expect } from 'vitest';
import { calculateRSI, calculateHeikinAshi } from './indicators';
import { HistoricalData } from './types';

describe('calculateRSI', () => {
  it('should calculate RSI correctly for a known dataset', () => {
    // Known dataset for a 14-period RSI
    const data = [
      44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42,
      45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00,
      46.03, 46.41, 46.22, 45.64
    ];

    const rsi = calculateRSI(data, 14);

    expect(rsi).toHaveLength(data.length);

    // First 14 should be null
    for (let i = 0; i < 14; i++) {
      expect(rsi[i]).toBeNull();
    }

    // Check known values for the remaining data points
    const rsiAt14 = rsi[14] as number;
    expect(rsiAt14).toBeGreaterThan(69);
    expect(rsiAt14).toBeLessThan(72);

    const rsiAt15 = rsi[15] as number;
    expect(rsiAt15).toBeGreaterThan(65);
    expect(rsiAt15).toBeLessThan(68);
  });

  it('should return an array of nulls if data length is less than or equal to period', () => {
    const data = [1, 2, 3, 4, 5];
    const rsi = calculateRSI(data, 5);

    expect(rsi).toHaveLength(5);
    rsi.forEach(val => expect(val).toBeNull());
  });
});

describe('calculateHeikinAshi', () => {
    it('returns an empty array when given empty input', () => {
        expect(calculateHeikinAshi([])).toEqual([]);
    });

    it('calculates Heikin Ashi correctly for a single data point', () => {
        const input: HistoricalData[] = [
            { time: 1, open: 100, high: 110, low: 90, close: 105, volume: 1000 }
        ];

        const result = calculateHeikinAshi(input);

        expect(result).toHaveLength(1);
        expect(result[0].ha_close).toBe(101.25);
        expect(result[0].ha_open).toBe(102.5);
        expect(result[0].ha_high).toBe(110);
        expect(result[0].ha_low).toBe(90);
    });

    it('calculates Heikin Ashi correctly for multiple data points', () => {
        const input: HistoricalData[] = [
            { time: 1, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
            { time: 2, open: 105, high: 120, low: 100, close: 115, volume: 1500 }
        ];

        const result = calculateHeikinAshi(input);

        expect(result).toHaveLength(2);
        expect(result[1].ha_close).toBe(110);
        expect(result[1].ha_open).toBe(101.875);
    });
});
