import { describe, it, expect } from 'vitest';
import { calculateHeikinAshi } from './indicators';
import { HistoricalData } from './types';

describe('calculateHeikinAshi', () => {
    it('returns an empty array when given empty input', () => {
        expect(calculateHeikinAshi([])).toEqual([]);
    });

    it('calculates Heikin Ashi correctly for a single data point', () => {
        const input: HistoricalData[] = [
            { time: 1, open: 100, high: 110, low: 90, close: 105, volume: 1000 }
        ];

        const result = calculateHeikinAshi(input);

        expect(result).toHaveLength(1);

        // haClose = (100 + 110 + 90 + 105) / 4 = 101.25
        expect(result[0].ha_close).toBe(101.25);

        // haOpen = (100 + 105) / 2 = 102.5
        expect(result[0].ha_open).toBe(102.5);

        // haHigh = Math.max(110, 102.5, 101.25) = 110
        expect(result[0].ha_high).toBe(110);

        // haLow = Math.min(90, 102.5, 101.25) = 90
        expect(result[0].ha_low).toBe(90);

        // check original properties preserved
        expect(result[0].time).toBe(1);
        expect(result[0].volume).toBe(1000);
    });

    it('calculates Heikin Ashi correctly for multiple data points', () => {
        const input: HistoricalData[] = [
            { time: 1, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
            { time: 2, open: 105, high: 120, low: 100, close: 115, volume: 1500 }
        ];

        const result = calculateHeikinAshi(input);

        expect(result).toHaveLength(2);

        // Previous values: haOpen1 = 102.5, haClose1 = 101.25

        // Current values
        // haClose2 = (105 + 120 + 100 + 115) / 4 = 110
        expect(result[1].ha_close).toBe(110);

        // haOpen2 = (haOpen1 + haClose1) / 2 = (102.5 + 101.25) / 2 = 101.875
        expect(result[1].ha_open).toBe(101.875);

        // haHigh2 = Math.max(120, 101.875, 110) = 120
        expect(result[1].ha_high).toBe(120);

        // haLow2 = Math.min(100, 101.875, 110) = 100
        expect(result[1].ha_low).toBe(100);
    });

    it('handles zero values correctly', () => {
        const input: HistoricalData[] = [
            { time: 1, open: 0, high: 0, low: 0, close: 0, volume: 0 }
        ];

        const result = calculateHeikinAshi(input);

        expect(result).toHaveLength(1);
        expect(result[0].ha_close).toBe(0);
        expect(result[0].ha_open).toBe(0);
        expect(result[0].ha_high).toBe(0);
        expect(result[0].ha_low).toBe(0);
    });

    it('handles negative values correctly', () => {
        const input: HistoricalData[] = [
            { time: 1, open: -100, high: -50, low: -150, close: -120, volume: 1000 }
        ];

        const result = calculateHeikinAshi(input);

        expect(result).toHaveLength(1);

        // haClose = (-100 - 50 - 150 - 120) / 4 = -105
        expect(result[0].ha_close).toBe(-105);

        // haOpen = (-100 - 120) / 2 = -110
        expect(result[0].ha_open).toBe(-110);

        // haHigh = Math.max(-50, -110, -105) = -50
        expect(result[0].ha_high).toBe(-50);

        // haLow = Math.min(-150, -110, -105) = -150
        expect(result[0].ha_low).toBe(-150);
    });
});
