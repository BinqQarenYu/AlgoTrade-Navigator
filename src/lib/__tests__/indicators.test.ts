import { describe, it, expect } from 'vitest';
import { calculateSMA, calculateEMA, calculateMFI, calculateCoppockCurve, calculatePivotPoints, calculateCCI, calculateIchimokuCloud, calculateDonchianChannels, calculateSemafor } from '../indicators';
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

    it('calculates CCI correctly with optimized logic', () => {
        const data: HistoricalData[] = [
            { time: 1, open: 10, high: 24, low: 10, close: 14, volume: 100 }, // TP = 16
            { time: 2, open: 10, high: 28, low: 12, close: 14, volume: 100 }, // TP = 18
            { time: 3, open: 10, high: 32, low: 14, close: 14, volume: 100 }, // TP = 20
        ];
        // SMA of typical prices for period 3 = (16 + 18 + 20) / 3 = 18
        // Mean deviation at index 2 = (|16 - 18| + |18 - 18| + |20 - 18|) / 3 = (2 + 0 + 2) / 3 = 4/3 = 1.333333333
        // CCI = (20 - 18) / (0.015 * 4/3) = 2 / 0.02 = 100
        const result = calculateCCI(data, 3);
        expect(result.length).toBe(3);
        expect(result[0]).toBeNull();
        expect(result[1]).toBeNull();
        expect(result[2]).toBeCloseTo(100, 5);
    });

    it('calculates Ichimoku Cloud correctly including chikou span', () => {
        const data: HistoricalData[] = Array.from({ length: 30 }, (_, i) => ({
            time: i * 60,
            timestamp: i * 60000,
            open: 100 + i,
            high: 110 + i,
            low: 90 + i,
            close: 105 + i,
            volume: 1000
        }));

        const result = calculateIchimokuCloud(data, 9, 26, 52, 5);
        expect(result.tenkan.length).toBe(30);
        expect(result.kijun.length).toBe(30);
        expect(result.senkouA.length).toBe(30);
        expect(result.senkouB.length).toBe(30);
        expect(result.chikou.length).toBe(30);

        // Chikou span displaced backward by 5 periods: chikou[i - 5] = data[i].close
        expect(result.chikou[0]).toBe(data[5].close); // index 0 has close of index 5
        expect(result.chikou[10]).toBe(data[15].close);
    });

    it('calculates Donchian Channels and Semafor correctly', () => {
        const data: HistoricalData[] = Array.from({ length: 10 }, (_, i) => ({
            time: i * 60,
            timestamp: i * 60000,
            open: 100 + i,
            high: 105 + i,
            low: 95 + i,
            close: 100 + i,
            volume: 1000
        }));

        const donchian = calculateDonchianChannels(data, 5);
        expect(donchian.upper.length).toBe(10);
        expect(donchian.upper[4]).toBe(109); // max high of first 5 candles (105..109)
        expect(donchian.lower[4]).toBe(95);  // min low of first 5 candles (95..99)
        expect(donchian.middle[4]).toBe((109 + 95) / 2);

        const semafor = calculateSemafor(data, 3, 5, 7);
        expect(semafor.length).toBe(10);
        expect(semafor[2].level1Top).toBe(true);
    });
});
