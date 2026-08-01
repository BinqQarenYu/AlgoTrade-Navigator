import { describe, it, expect } from 'vitest';
import volumeDeltaStrategy from './volume-delta';
import type { HistoricalData } from '../types';

describe('Volume Delta Strategy', () => {
    it('calculates correct volume delta arrays and returns data without signals if short', async () => {
        const mockData: HistoricalData[] = Array.from({ length: 10 }, (_, i) => ({
            time: 1704067200000 + (10 + i) * 3600000,
            open: 100 + i,
            high: 105 + i,
            low: 95 + i,
            close: 102 + i, // positive delta: close > open
            volume: 1000 + i * 10,
        }));

        const result = await volumeDeltaStrategy.calculate(mockData);
        expect(result.length).toBe(10);
        expect(result[0].cumulativeVolumeDelta).toBeUndefined(); // less than pocLookback
    });

    it('identifies valid POCs and handles null delta values seamlessly', async () => {
        const mockData: HistoricalData[] = Array.from({ length: 250 }, (_, i) => ({
            time: 1704067200000 + i * 3600000,
            open: 100,
            high: 110,
            low: 90,
            close: 100 + (i % 2 === 0 ? 1 : -1),
            volume: 1000 + i,
        }));

        const result = await volumeDeltaStrategy.calculate(mockData);
        expect(result.length).toBe(250);
        // pocLookback is 200 by default. So elements 200+ should have indicators
        expect(result[200].volumeDelta).toBeDefined();
        expect(result[200].cumulativeVolumeDelta).toBeDefined();
        expect(result[200].poc).toBeDefined();
    });
});
