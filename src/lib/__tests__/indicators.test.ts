import { describe, it, expect } from 'vitest';
import { calculateSMA, calculateEMA, calculateMFI, calculateCoppockCurve } from '../indicators';
import type { HistoricalData } from '../types';

describe('Technical Indicators (SMA, EMA, MFI, Coppock Curve)', () => {
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
});
