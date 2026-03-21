import { describe, it, expect } from 'vitest';
import { calculateHeikinAshi } from './indicators';
import type { HistoricalData } from './types';

describe('calculateHeikinAshi', () => {
    it('returns an empty array when given empty data', () => {
        const result = calculateHeikinAshi([]);
        expect(result).toEqual([]);
    });

    it('calculates the correct Heikin Ashi values for a single candle', () => {
        const data: HistoricalData[] = [
            { time: 1000, open: 100, high: 110, low: 90, close: 105, volume: 1000 }
        ];

        const result = calculateHeikinAshi(data);

        expect(result.length).toBe(1);

        // ha_close = (100 + 110 + 90 + 105) / 4 = 101.25
        expect(result[0].ha_close).toBe(101.25);

        // ha_open = (100 + 105) / 2 = 102.5 (for the first candle)
        expect(result[0].ha_open).toBe(102.5);

        // ha_high = Math.max(110, 102.5, 101.25) = 110
        expect(result[0].ha_high).toBe(110);

        // ha_low = Math.min(90, 102.5, 101.25) = 90
        expect(result[0].ha_low).toBe(90);
    });

    it('calculates the correct Heikin Ashi values for multiple candles', () => {
        const data: HistoricalData[] = [
            { time: 1000, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
            { time: 2000, open: 105, high: 120, low: 100, close: 115, volume: 1500 }
        ];

        const result = calculateHeikinAshi(data);

        expect(result.length).toBe(2);

        // First candle checks (same as above)
        expect(result[0].ha_close).toBe(101.25);
        expect(result[0].ha_open).toBe(102.5);
        expect(result[0].ha_high).toBe(110);
        expect(result[0].ha_low).toBe(90);

        // Second candle checks
        // ha_close = (105 + 120 + 100 + 115) / 4 = 110
        expect(result[1].ha_close).toBe(110);

        // ha_open = (prev_ha_open + prev_ha_close) / 2 = (102.5 + 101.25) / 2 = 101.875
        expect(result[1].ha_open).toBe(101.875);

        // ha_high = Math.max(120, 101.875, 110) = 120
        expect(result[1].ha_high).toBe(120);

        // ha_low = Math.min(100, 101.875, 110) = 100
        expect(result[1].ha_low).toBe(100);
    });

    it('calculates correct values when ha_open or ha_close are the extremes (doji-like)', () => {
        const data: HistoricalData[] = [
            { time: 1000, open: 100, high: 105, low: 95, close: 100, volume: 1000 }
        ];

        const result = calculateHeikinAshi(data);

        // ha_close = (100 + 105 + 95 + 100) / 4 = 100
        expect(result[0].ha_close).toBe(100);

        // ha_open = (100 + 100) / 2 = 100
        expect(result[0].ha_open).toBe(100);

        // ha_high = Math.max(105, 100, 100) = 105
        expect(result[0].ha_high).toBe(105);

        // ha_low = Math.min(95, 100, 100) = 95
        expect(result[0].ha_low).toBe(95);
    });
});
