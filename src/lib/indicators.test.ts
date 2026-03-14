import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateBollingerBands } from './indicators.ts';

describe('calculateBollingerBands', () => {
    it('returns empty arrays when given empty data', () => {
        const result = calculateBollingerBands([], 20, 2);
        assert.deepStrictEqual(result.upper, []);
        assert.deepStrictEqual(result.middle, []);
        assert.deepStrictEqual(result.lower, []);
    });

    it('returns nulls when data length is less than period', () => {
        const data = [10, 12, 11];
        const period = 5;
        const result = calculateBollingerBands(data, period, 2);

        const expectedNulls = [null, null, null];
        assert.deepStrictEqual(result.upper, expectedNulls);
        assert.deepStrictEqual(result.middle, expectedNulls);
        assert.deepStrictEqual(result.lower, expectedNulls);
    });

    it('calculates correct bands for valid data', () => {
        // Simple data with a clear mean and variance
        const data = [10, 10, 10, 10, 20];
        const period = 5;
        const multiplier = 2;

        const result = calculateBollingerBands(data, period, multiplier);

        assert.strictEqual(result.upper.length, 5);
        assert.strictEqual(result.middle.length, 5);
        assert.strictEqual(result.lower.length, 5);

        assert.strictEqual(result.upper[0], null);
        assert.strictEqual(result.middle[0], null);
        assert.strictEqual(result.lower[0], null);

        // At index 4 (5th element), the slice is [10, 10, 10, 10, 20]
        // Mean (SMA) = (10+10+10+10+20) / 5 = 60 / 5 = 12
        // Variance = ((10-12)^2 + (10-12)^2 + (10-12)^2 + (10-12)^2 + (20-12)^2) / 5
        //          = (4 + 4 + 4 + 4 + 64) / 5 = 80 / 5 = 16
        // StdDev = sqrt(16) = 4

        const expectedMiddle = 12;
        const expectedStdDev = 4;
        const expectedUpper = expectedMiddle + (expectedStdDev * multiplier); // 12 + 8 = 20
        const expectedLower = expectedMiddle - (expectedStdDev * multiplier); // 12 - 8 = 4

        assert.strictEqual(result.middle[4], expectedMiddle);
        assert.strictEqual(result.upper[4], expectedUpper);
        assert.strictEqual(result.lower[4], expectedLower);
    });

    it('applies different standard deviation multipliers correctly', () => {
        const data = [10, 10, 10, 10, 20];
        const period = 5;

        // Multiplier 1
        const result1 = calculateBollingerBands(data, period, 1);
        const expectedMiddle = 12;
        const expectedStdDev = 4;

        assert.strictEqual(result1.upper[4], expectedMiddle + expectedStdDev); // 16
        assert.strictEqual(result1.lower[4], expectedMiddle - expectedStdDev); // 8

        // Multiplier 3
        const result3 = calculateBollingerBands(data, period, 3);

        assert.strictEqual(result3.upper[4], expectedMiddle + (expectedStdDev * 3)); // 24
        assert.strictEqual(result3.lower[4], expectedMiddle - (expectedStdDev * 3)); // 0
    });
});
