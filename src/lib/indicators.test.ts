import { describe, test } from 'node:test';
import assert from 'node:assert';
import { calculateEMA } from './indicators.ts'; // Note the .js extension might be needed for native node esm, or let's try .ts

describe('calculateEMA', () => {
    test('returns array of nulls when data length is less than period', () => {
        const data = [1, 2];
        const result = calculateEMA(data, 3);
        assert.deepStrictEqual(result, [null, null]);
    });

    test('returns correct EMA for period exactly equal to data length', () => {
        const data = [10, 20, 30];
        // period 3, SMA = (10+20+30)/3 = 20
        const result = calculateEMA(data, 3);
        assert.deepStrictEqual(result, [null, null, 20]);
    });

    test('returns correct EMA for data length greater than period', () => {
        const data = [10, 20, 30, 40, 50];
        const period = 3;
        const result = calculateEMA(data, period);

        // Manual calculation
        // SMA of first 3 elements (10, 20, 30): 20
        // Result[2] = 20

        // Multiplier for EMA = 2 / (3 + 1) = 0.5
        // EMA at index 3: (40 - 20) * 0.5 + 20 = 10 + 20 = 30
        // Result[3] = 30

        // EMA at index 4: (50 - 30) * 0.5 + 30 = 10 + 30 = 40
        // Result[4] = 40

        assert.deepStrictEqual(result, [null, null, 20, 30, 40]);
    });

    test('handles empty array', () => {
        const result = calculateEMA([], 5);
        assert.deepStrictEqual(result, []);
    });

    test('handles decimal values accurately', () => {
        const data = [1.5, 2.5, 3.5, 4.5, 5.5];
        const period = 3;
        const result = calculateEMA(data, period);

        // Result[2]: (1.5+2.5+3.5)/3 = 2.5
        // Result[3]: (4.5 - 2.5) * 0.5 + 2.5 = 1 + 2.5 = 3.5
        // Result[4]: (5.5 - 3.5) * 0.5 + 3.5 = 1 + 3.5 = 4.5
        assert.deepStrictEqual(result, [null, null, 2.5, 3.5, 4.5]);
    });

    test('handles negative values correctly', () => {
        const data = [-10, -20, -30, -40, -50];
        const period = 3;
        const result = calculateEMA(data, period);

        // Result[2]: (-10-20-30)/3 = -20
        // Result[3]: (-40 - (-20)) * 0.5 + (-20) = (-20) * 0.5 - 20 = -10 - 20 = -30
        // Result[4]: (-50 - (-30)) * 0.5 + (-30) = (-20) * 0.5 - 30 = -10 - 30 = -40
        assert.deepStrictEqual(result, [null, null, -20, -30, -40]);
    });
});
