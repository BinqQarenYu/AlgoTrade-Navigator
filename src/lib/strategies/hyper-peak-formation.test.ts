import { describe, it, expect } from 'vitest';
import hyperPeakFormationStrategy, { defaultHyperPFFParams } from './hyper-peak-formation';
import type { HistoricalData } from '../types';

describe('Hyper Peak Formation Strategy', () => {
    it('returns empty array on invalid inputs', async () => {
        expect(await hyperPeakFormationStrategy.calculate([])).toEqual([]);
        expect(await hyperPeakFormationStrategy.calculate(null as any)).toEqual([]);
    });

    it('attaches EMAs and processes data without throwing errors', async () => {
        const mockData: HistoricalData[] = Array.from({ length: 100 }, (_, i) => ({
            time: 1704067200000 + i * 3600000,
            open: 100,
            high: 105 + Math.sin(i / 5) * 5,
            low: 95 + Math.sin(i / 5) * 5,
            close: 100 + Math.sin(i / 5) * 5,
            volume: 1000,
        }));

        const params = { ...defaultHyperPFFParams, debug: false };
        const result = await hyperPeakFormationStrategy.calculate(mockData, params);
        expect(result.length).toBe(100);
        expect(result[60].ema_short).toBeDefined();
        expect(result[60].ema_long).toBeDefined();
    });
});
