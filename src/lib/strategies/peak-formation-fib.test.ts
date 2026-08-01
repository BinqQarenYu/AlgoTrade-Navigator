import { describe, it, expect } from 'vitest';
import peakFormationFibStrategy from './peak-formation-fib';
import type { HistoricalData } from '../types';

describe('Peak Formation Fib Strategy', () => {
    it('returns empty array on invalid inputs', async () => {
        expect(await peakFormationFibStrategy.calculate([])).toEqual([]);
        expect(await peakFormationFibStrategy.calculate(null as any)).toEqual([]);
    });

    it('attaches EMAs correctly and parses valid data structure', async () => {
        const mockData: HistoricalData[] = Array.from({ length: 60 }, (_, i) => ({
            time: 1704067200000 + i * 3600000,
            open: 100,
            high: 110,
            low: 90,
            close: 100 + i,
            volume: 1000,
        }));

        const result = await peakFormationFibStrategy.calculate(mockData);
        expect(result.length).toBe(60);
        expect(result[55].ema_short).toBeDefined();
        expect(result[55].ema_long).toBeDefined();
    });
});
