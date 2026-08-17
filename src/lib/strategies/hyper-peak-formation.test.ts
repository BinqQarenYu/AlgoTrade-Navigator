import { describe, it, expect } from 'vitest';
import hyperPeakFormationStrategy from './hyper-peak-formation';
import type { HistoricalData } from '../types';

describe('Hyper Peak Formation Strategy', () => {
    it('returns empty array on invalid inputs', async () => {
        expect(await hyperPeakFormationStrategy.calculate([])).toEqual([]);
        expect(await hyperPeakFormationStrategy.calculate(null as any)).toEqual([]);
    });

    it('attaches EMAs and processes data without error', async () => {
        const mockData: HistoricalData[] = Array.from({ length: 60 }, (_, i) => ({
            time: 1704067200000 + i * 3600000,
            open: 100,
            high: 110,
            low: 90,
            close: 100 + i,
            volume: 1000,
        }));

        const result = await hyperPeakFormationStrategy.calculate(mockData, {
            ...hyperPeakFormationStrategy.defaultHyperPFFParams,
            debug: false,
        });

        expect(result.length).toBe(60);
        expect(result[55].ema_short).toBeDefined();
        expect(result[55].ema_long).toBeDefined();
    });
});
