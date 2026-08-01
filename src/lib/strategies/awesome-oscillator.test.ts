import { describe, it, expect } from 'vitest';
import awesomeOscillatorStrategy from './awesome-oscillator';
import type { HistoricalData } from '../types';

describe('Awesome Oscillator Strategy', () => {
    it('returns empty array on invalid inputs or short arrays', async () => {
        expect(await awesomeOscillatorStrategy.calculate([])).toEqual([]);
    });

    it('attaches indicator appropriately', async () => {
        const mockData: HistoricalData[] = Array.from({ length: 40 }, (_, i) => ({
            time: 1704067200000 + i * 3600000,
            open: 100,
            high: 110,
            low: 90,
            close: 100 + i,
            volume: 1000,
        }));

        const result = await awesomeOscillatorStrategy.calculate(mockData);
        expect(result.length).toBe(40);
        expect(result[35].awesome_oscillator).toBeDefined();
    });
});
