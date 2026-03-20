
import { describe, it, expect } from 'vitest';
import { calculatePivotPoints } from '../indicators';
import { HistoricalData } from '../types';

describe('calculatePivotPoints Optimization', () => {
    it('calculates pivot points correctly (regression test)', () => {
        const data: HistoricalData[] = [
            { time: 0, open: 100, high: 110, low: 90, close: 100, volume: 1000 }, // i=0
            { time: 1, open: 100, high: 120, low: 80, close: 110, volume: 1000 }, // i=1
            { time: 2, open: 110, high: 115, low: 105, close: 110, volume: 1000 }, // i=2
        ];

        // period = 1
        // i=0: prevIdx=-1 -> null
        // i=1: prevIdx=0, high=110, low=90, close=100 -> pp=(110+90+100)/3 = 100
        // i=2: prevIdx=1, high=120, low=80, close=110 -> pp=(120+80+110)/3 = 103.33

        const result = calculatePivotPoints(data, 1);

        expect(result.pp[0]).toBeNull();
        expect(result.pp[1]).toBeCloseTo(100);
        expect(result.pp[2]).toBeCloseTo(103.33);

        // Check levels for i=1
        // pp=100, high=110, low=90
        // r1 = 2*100 - 90 = 110
        // s1 = 2*100 - 110 = 90
        expect(result.r1[1]).toBeCloseTo(110);
        expect(result.s1[1]).toBeCloseTo(90);
    });

    it('handles period > 1', () => {
        const data: HistoricalData[] = [
            { time: 0, open: 100, high: 110, low: 90, close: 100, volume: 1000 }, // i=0
            { time: 1, open: 100, high: 120, low: 80, close: 110, volume: 1000 }, // i=1
            { time: 2, open: 110, high: 115, low: 105, close: 110, volume: 1000 }, // i=2
        ];

        // period = 2
        // i=0: prevIdx=-1 -> null
        // i=1: prevIdx=0, window [0,0] -> length 1 < 2 -> null (SlidingWindowExtreme returns null if window not full)
        // i=2: prevIdx=1, window [0,1] -> high=120, low=80, close=110 -> pp=103.33

        const result = calculatePivotPoints(data, 2);
        expect(result.pp[0]).toBeNull();
        expect(result.pp[1]).toBeNull();
        expect(result.pp[2]).toBeCloseTo(103.33);
    });
});
