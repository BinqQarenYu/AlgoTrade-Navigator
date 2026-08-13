import { describe, it, expect } from 'vitest';
import { calculateSMA, calculateEMA, calculateMFI, calculateCoppockCurve, calculatePivotPoints, calculateCCI } from '../indicators';
import type { HistoricalData } from '../types';

describe('Technical Indicators (SMA, EMA, MFI, Coppock Curve, Pivot Points)', () => {
    it('calculates SMA correctly', () => {
        const data = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
        const sma = calculateSMA(data, 3);
        expect(Math.abs(sma[2]! - 11)).toBeLessThan(0.01);
        expect(Math.abs(sma[9]! - 18)).toBeLessThan(0.01);
    });

    it('calculates EMA correctly', () => {
        const data = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
        const ema = calculateEMA(data, 3);
        expect(Math.abs(ema[2]! - 11)).toBeLessThan(0.01);
        expect(Math.abs(ema[3]! - 12)).toBeLessThan(0.01);
    });

    it('calculates MFI correctly and handles zero flow without returning false 98.03', () => {
        const flatData: HistoricalData[] = Array.from({ length: 20 }, (_, i) => ({
            time: i * 60,
            timestamp: i * 60000,
            open: 100,
            high: 105,
            low: 95,
            close: 100,
            volume: 1000
        }));
        const mfi = calculateMFI(flatData, 14);
        expect(mfi[14]).toBe(50);
    });

    it('calculates Coppock Curve safely when base price is zero', () => {
        const prices = [0, 10, 12, 11, 15, 14, 16, 18, 20, 22, 21, 25, 24, 26, 28, 30];
        const coppock = calculateCoppockCurve(prices, 10, 14, 10);
        expect(coppock.length).toBe(prices.length);
        expect(coppock.some(v => v !== null && isNaN(v))).toBe(false);
    });

    it('calculates Pivot Points correctly', () => {
        const data: HistoricalData[] = Array.from({ length: 15 }, (_, i) => ({
            time: i * 60,
            timestamp: i * 60000,
            open: 100 + i,
            high: 105 + i,
            low: 95 + i,
            close: 101 + i,
            volume: 1000
        }));

        const period = 5;
        const result = calculatePivotPoints(data, period);
        expect(result.pp.length).toBe(15);
        expect(result.pp[0]).toBeNull();
        expect(result.pp[4]).toBeNull();

        // At index 5, the slice of previous candles is indices 0, 1, 2, 3, 4
        // Highs: 105, 106, 107, 108, 109 -> Max high = 109
        // Lows: 95, 96, 97, 98, 99 -> Min low = 95
        // Close of previous candle (index 4): 101 + 4 = 105
        // PP = (109 + 95 + 105) / 3 = 309 / 3 = 103
        expect(result.pp[5]).toBeCloseTo(103, 5);

        // R1 = 2 * PP - Low = 2 * 103 - 95 = 206 - 95 = 111
        expect(result.r1[5]).toBeCloseTo(111, 5);

        // S1 = 2 * PP - High = 2 * 103 - 109 = 206 - 109 = 97
        expect(result.s1[5]).toBeCloseTo(97, 5);
    });

    it('calculates CCI correctly and handles edge cases', () => {
        // Construct small dummy data
        const data: HistoricalData[] = Array.from({ length: 6 }, (_, i) => ({
            time: i * 60,
            timestamp: i * 60000,
            open: 10 + i,
            high: 12 + i,
            low: 8 + i,
            close: 10 + i,
            volume: 1000
        }));

        // Typical prices should be: (high + low + close) / 3
        // index 0: (12+8+10)/3 = 10
        // index 1: (13+9+11)/3 = 11
        // index 2: (14+10+12)/3 = 12
        // index 3: (15+11+13)/3 = 13
        // index 4: (16+12+14)/3 = 14
        // index 5: (17+13+15)/3 = 15

        // Period 3
        // SMA of Typical prices:
        // index 2: (10+11+12)/3 = 11
        // index 3: (11+12+13)/3 = 12
        // index 4: (12+13+14)/3 = 13
        // index 5: (13+14+15)/3 = 14

        // Mean deviation for index 2 (window: 10, 11, 12, SMA=11):
        // (|10-11| + |11-11| + |12-11|)/3 = (1 + 0 + 1)/3 = 2/3
        // CCI = (typicalPrice - SMA) / (0.015 * meanDeviation)
        // CCI = (12 - 11) / (0.015 * (2/3)) = 1 / 0.01 = 100

        const cci3 = calculateCCI(data, 3);
        expect(cci3.length).toBe(6);
        expect(cci3[0]).toBeNull();
        expect(cci3[1]).toBeNull();
        expect(cci3[2]).toBeCloseTo(100, 5);

        // Edge case: period > data.length
        const cciEmpty = calculateCCI(data, 10);
        expect(cciEmpty).toEqual([null, null, null, null, null, null]);

        // Edge case: period is invalid
        const cciInvalid = calculateCCI(data, -1);
        expect(cciInvalid).toEqual([null, null, null, null, null, null]);
    });
});
