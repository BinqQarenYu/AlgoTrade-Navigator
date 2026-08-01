import { describe, it, expect } from 'vitest';
import chaikinMoneyFlowStrategy from './chaikin-money-flow';
import type { HistoricalData } from '../types';

describe('Chaikin Money Flow Strategy', () => {
    it('returns empty array on invalid inputs or short arrays', async () => {
        expect(await chaikinMoneyFlowStrategy.calculate([])).toEqual([]);
    });

    it('attaches CMF appropriately', async () => {
        const mockData: HistoricalData[] = Array.from({ length: 40 }, (_, i) => ({
            time: 1704067200000 + i * 3600000,
            open: 100,
            high: 110,
            low: 90,
            close: 100 + i,
            volume: 1000,
        }));

        const result = await chaikinMoneyFlowStrategy.calculate(mockData);
        expect(result.length).toBe(40);
        expect(result[35].cmf).toBeDefined();
    });
});
