
import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { calculatePivotPoints } from '../indicators';
import { HistoricalData } from '../types';

describe('calculatePivotPoints', () => {
  it('should calculate Pivot Points correctly for a simple dataset', () => {
    const data: Partial<HistoricalData>[] = [
      { high: 10, low: 5, close: 8 },  // 0
      { high: 12, low: 6, close: 9 },  // 1
      { high: 11, low: 7, close: 10 }, // 2
      { high: 13, low: 8, close: 11 }  // 3
    ];

    const period = 2;
    const result = calculatePivotPoints(data as HistoricalData[], period);

    // Initial periods should be null
    assert.strictEqual(result.pp[0], null);
    assert.strictEqual(result.pp[1], null);

    // Index 2: slice [0, 1], high=12, low=5, close=9
    // pp = (12 + 5 + 9) / 3 = 8.666...
    assert.ok(Math.abs(result.pp[2]! - 8.666666) < 0.0001);
    // r1 = 2 * 8.666... - 5 = 12.333...
    assert.ok(Math.abs(result.r1[2]! - 12.333333) < 0.0001);
    // s1 = 2 * 8.666... - 12 = 5.333...
    assert.ok(Math.abs(result.s1[2]! - 5.333333) < 0.0001);

    // Index 3: slice [1, 2], high=12, low=6, close=10
    // pp = (12 + 6 + 10) / 3 = 9.333...
    assert.ok(Math.abs(result.pp[3]! - 9.333333) < 0.0001);
    // r1 = 2 * 9.333... - 6 = 12.666...
    assert.ok(Math.abs(result.r1[3]! - 12.666666) < 0.0001);
    // s1 = 2 * 9.333... - 12 = 6.666...
    assert.ok(Math.abs(result.s1[3]! - 6.666666) < 0.0001);
  });

  it('should return nulls if data length is less than or equal to period', () => {
    const data: Partial<HistoricalData>[] = [
      { high: 10, low: 5, close: 8 },
      { high: 12, low: 6, close: 9 }
    ];
    const period = 2;
    const result = calculatePivotPoints(data as HistoricalData[], period);
    assert.strictEqual(result.pp.length, 2);
    assert.strictEqual(result.pp[0], null);
    assert.strictEqual(result.pp[1], null);
  });
});
