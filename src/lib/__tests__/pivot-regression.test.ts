import { describe, it, expect } from 'vitest';
import { calculatePivotPoints } from '../indicators';
import { HistoricalData } from '../types';

/**
 * The original O(N*P) implementation of calculatePivotPoints
 * for regression testing.
 */
function originalCalculatePivotPoints(data: HistoricalData[], period: number): { pp: (number|null)[], s1: (number|null)[], s2: (number|null)[], s3: (number|null)[], r1: (number|null)[], r2: (number|null)[], r3: (number|null)[] } {
    const pp: (number | null)[] = [];
    const s1: (number | null)[] = [];
    const s2: (number | null)[] = [];
    const s3: (number | null)[] = [];
    const r1: (number | null)[] = [];
    const r2: (number | null)[] = [];
    const r3: (number | null)[] = [];

    for (let i = 0; i < data.length; i++) {
        if (i < period) {
            pp.push(null);
            s1.push(null);
            s2.push(null);
            s3.push(null);
            r1.push(null);
            r2.push(null);
            r3.push(null);
        } else {
            const slice = data.slice(i - period, i);
            if (slice.length === 0 || !slice[slice.length - 1]) {
                 pp.push(null);
                 s1.push(null);
                 s2.push(null);
                 s3.push(null);
                 r1.push(null);
                 r2.push(null);
                 r3.push(null);
                 continue;
            }

            const high = Math.max(...slice.map(d => d.high));
            const low = Math.min(...slice.map(d => d.low));
            const close = slice[slice.length - 1].close;

            const ppVal = (high + low + close) / 3;
            const r1Val = (2 * ppVal) - low;
            const s1Val = (2 * ppVal) - high;
            const r2Val = ppVal + (high - low);
            const s2Val = ppVal - (high - low);
            const r3Val = high + 2 * (ppVal - low);
            const s3Val = low - 2 * (high - ppVal);

            pp.push(ppVal);
            r1.push(r1Val);
            s1.push(s1Val);
            r2.push(r2Val);
            s2.push(s2Val);
            r3.push(r3Val);
            s3.push(s3Val);
        }
    }
    return { pp, s1, s2, s3, r1, r2, r3 };
}

const generateData = (n: number): HistoricalData[] => {
  const data: HistoricalData[] = [];
  let price = 100;
  for (let i = 0; i < n; i++) {
    const change = (Math.random() - 0.5) * 2;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random();
    const low = Math.min(open, close) - Math.random();
    data.push({
      time: i,
      open,
      high,
      low,
      close,
      volume: Math.random() * 1000
    });
    price = close;
  }
  return data;
};

describe('calculatePivotPoints Optimization', () => {
  it('should return identical results to the original implementation', () => {
    const n = 500;
    const period = 20;
    const testData = generateData(n);

    const original = originalCalculatePivotPoints(testData, period);
    const optimized = calculatePivotPoints(testData, period);

    const keys = ['pp', 's1', 's2', 's3', 'r1', 'r2', 'r3'] as const;

    for (let i = 0; i < n; i++) {
      for (const key of keys) {
        const origVal = original[key][i];
        const optVal = optimized[key][i];

        if (origVal === null) {
          expect(optVal).toBeNull();
        } else {
          expect(optVal).not.toBeNull();
          expect(optVal!).toBeCloseTo(origVal!, 10);
        }
      }
    }
  });

  it('should handle data length less than period', () => {
    const data = generateData(5);
    const result = calculatePivotPoints(data, 10);
    expect(result.pp.every(v => v === null)).toBe(true);
  });
});
