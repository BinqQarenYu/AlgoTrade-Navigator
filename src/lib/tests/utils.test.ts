import { test, describe } from 'node:test';
import assert from 'node:assert';
import { formatLargeNumber } from '../utils.ts';

describe('formatLargeNumber', () => {
  test('returns "0" for 0, null, or undefined', () => {
    assert.strictEqual(formatLargeNumber(0), '0');
    // Testing invalid inputs normally caught by TypeScript but possible at runtime
    assert.strictEqual(formatLargeNumber(null as any), '0');
    assert.strictEqual(formatLargeNumber(undefined as any), '0');
  });

  test('returns string representation for numbers < 1000', () => {
    assert.strictEqual(formatLargeNumber(999), '999');
    assert.strictEqual(formatLargeNumber(1.23), '1.23');
    assert.strictEqual(formatLargeNumber(500), '500');
  });

  test('formats thousands with K', () => {
    assert.strictEqual(formatLargeNumber(1000), '1K');
    assert.strictEqual(formatLargeNumber(1500), '1.5K');
    assert.strictEqual(formatLargeNumber(999999), '1000K'); // In current implementation, 999999 is rounded to 1000K, not 1M
  });

  test('formats millions with M', () => {
    assert.strictEqual(formatLargeNumber(1000000), '1M');
    assert.strictEqual(formatLargeNumber(1230000), '1.23M');
    assert.strictEqual(formatLargeNumber(1500000), '1.5M');
  });

  test('formats billions with B', () => {
    assert.strictEqual(formatLargeNumber(1000000000), '1B');
    assert.strictEqual(formatLargeNumber(1230000000), '1.23B');
  });

  test('formats trillions with T', () => {
    assert.strictEqual(formatLargeNumber(1000000000000), '1T');
    assert.strictEqual(formatLargeNumber(1230000000000), '1.23T');
  });

  test('respects custom digits parameter', () => {
    assert.strictEqual(formatLargeNumber(1555000, 1), '1.6M');
    assert.strictEqual(formatLargeNumber(1555000, 3), '1.555M');
    assert.strictEqual(formatLargeNumber(1234567, 4), '1.2346M');
  });

  test('strips trailing zeros in decimal part', () => {
    assert.strictEqual(formatLargeNumber(1000000), '1M'); // not 1.00M
    assert.strictEqual(formatLargeNumber(1500000), '1.5M'); // not 1.50M
  });
});
