import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { calculateMACD } from './indicators.ts';

describe('calculateMACD', () => {
    test('should return nulls for initial data points', () => {
        const data = [10, 12, 11, 14, 15, 13, 16, 18, 17, 19, 21, 20, 22, 24, 23];
        const result = calculateMACD(data, 3, 6, 3);

        // MACD line should be null for the first (longPeriod - 1) = 5 elements
        // Signal line should be null for (longPeriod - 1) + (signalPeriod - 1) = 5 + 2 = 7 elements
        // Histogram should be null where either MACD or Signal is null = 7 elements

        // Check lengths
        assert.strictEqual(result.macd.length, data.length);
        assert.strictEqual(result.signal.length, data.length);
        assert.strictEqual(result.histogram.length, data.length);

        // Check nulls
        for (let i = 0; i < 5; i++) {
            assert.strictEqual(result.macd[i], null, `MACD at ${i} should be null`);
        }
        for (let i = 0; i < 7; i++) {
            assert.strictEqual(result.signal[i], null, `Signal at ${i} should be null`);
            assert.strictEqual(result.histogram[i], null, `Histogram at ${i} should be null`);
        }

        // Check non-nulls
        assert.notStrictEqual(result.macd[5], null, 'MACD at 5 should not be null');
        assert.notStrictEqual(result.signal[7], null, 'Signal at 7 should not be null');
        assert.notStrictEqual(result.histogram[7], null, 'Histogram at 7 should not be null');
    });

    test('calculates MACD values correctly', () => {
        // Values derived from a known sequence to verify calculation
        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        // shortEma (period 3), longEma (period 6), signalEma (period 3)
        // Expected EMA calculation checks
        const result = calculateMACD(data, 3, 6, 3);

        // The exact values depend on the EMA initialization
        // Here we just verify the shape and relative characteristics of a trending market

        // For a perfectly linear upward trend, MACD should become positive
        const validMacds = result.macd.filter((x): x is number => x !== null);
        assert.ok(validMacds.length > 0);
        for (const val of validMacds) {
            // Short EMA should be higher than Long EMA in an upward trend
            assert.ok(val > 0, `MACD value ${val} should be positive for an upward trend`);
        }
    });

    test('histogram is difference between MACD and Signal', () => {
        const data = [22, 21, 23, 24, 26, 25, 28, 27, 29, 30, 31, 33, 35, 34, 32];
        const result = calculateMACD(data, 3, 5, 3);

        for (let i = 0; i < data.length; i++) {
            if (result.histogram[i] !== null) {
                // To avoid floating point equality issues, we check with a small epsilon
                const diff = result.macd[i]! - result.signal[i]!;
                assert.ok(Math.abs(result.histogram[i]! - diff) < 1e-10, `Histogram ${result.histogram[i]} does not match diff ${diff} at index ${i}`);
            }
        }
    });
});
