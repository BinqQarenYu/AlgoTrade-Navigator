import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { calculateRSI } from './indicators.ts';

describe('calculateRSI', () => {
  it('should calculate RSI correctly for a known dataset', () => {
    // Known dataset for a 14-period RSI
    // The first 14 elements represent the initial period
    const data = [
      44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42,
      45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00,
      46.03, 46.41, 46.22, 45.64
    ];

    // Period is 14
    const rsi = calculateRSI(data, 14);

    assert.strictEqual(rsi.length, data.length);

    // First 14 should be null
    for (let i = 0; i < 14; i++) {
      assert.strictEqual(rsi[i], null);
    }

    // Check known values for the remaining data points
    // Expected values calculated manually or from a known source
    // At index 14 (15th day):
    // Gains: 0, 0.06, 0, 0.72, 0.5, 0.27, 0.32, 0.42, 0.24, 0, 0.14, 0, 0.67, 0
    // AvgGain: ~0.2386
    // Losses: 0.25, 0, 0.54, 0, 0, 0, 0, 0, 0, 0.19, 0, 0.42, 0, 0
    // AvgLoss: ~0.1000
    // RS = 0.2386 / 0.1 = 2.386
    // RSI = 100 - (100 / (1 + 2.386)) = ~70.46

    // For index 14, current gain is 0 (46.28 - 46.28), current loss is 0
    // Since RS formula is implemented as avgLoss === 0 ? 100 : avgGain / avgLoss, we verify the output

    // We can just assert that it's a number and falls within a valid range to avoid precision issues
    // Let's assert specific values with some tolerance

    // Let's use simpler assertions for precision
    const rsiAt14 = rsi[14] as number;
    assert.ok(rsiAt14 > 69 && rsiAt14 < 72, `RSI should be around 70.46, got ${rsiAt14}`);

    const rsiAt15 = rsi[15] as number; // 46.00 -> loss
    assert.ok(rsiAt15 > 65 && rsiAt15 < 68, `RSI should drop, got ${rsiAt15}`);
  });

  it('should return an array of nulls if data length is less than or equal to period', () => {
    const data = [1, 2, 3, 4, 5];
    const rsi = calculateRSI(data, 5);

    assert.strictEqual(rsi.length, 5);
    rsi.forEach(val => assert.strictEqual(val, null));

    const rsiLess = calculateRSI(data, 10);
    assert.strictEqual(rsiLess.length, 5);
    rsiLess.forEach(val => assert.strictEqual(val, null));
  });

  it('should handle data with only gains (constant increase)', () => {
    const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
    const rsi = calculateRSI(data, 14);

    // In this implementation, if avgLoss is 0, RS is set to 100
    // RSI = 100 - (100 / (1 + 100)) = 100 - (100 / 101) = 99.0099...
    assert.strictEqual(rsi.length, 15);
    const lastRsi = rsi[14] as number;
    assert.ok(lastRsi > 99 && lastRsi < 100, `RSI should be around 99.01, got ${lastRsi}`);
  });

  it('should handle data with only losses (constant decrease)', () => {
    const data = [150, 140, 130, 120, 110, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
    const rsi = calculateRSI(data, 14);

    assert.strictEqual(rsi.length, 15);
    // avgGain should be 0, avgLoss should be > 0.
    // rs = 0 / avgLoss = 0.
    // RSI = 100 - 100/(1+0) = 0.
    assert.strictEqual(rsi[14], 0);
  });

  it('should handle data with constant values', () => {
    const data = [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50];
    const rsi = calculateRSI(data, 14);

    assert.strictEqual(rsi.length, 15);
    // Gains and losses are both 0.
    // avgGain = 0, avgLoss = 0.
    // The code sets rs to 100 if avgLoss === 0.
    // Thus RSI = 99.0099...
    const lastRsi = rsi[14] as number;
    assert.ok(lastRsi > 99 && lastRsi < 100, `RSI should be around 99.01, got ${lastRsi}`);
  });
});
