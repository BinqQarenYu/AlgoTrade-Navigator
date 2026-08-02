import { describe, it, expect } from 'vitest';
import { calculateSMA, calculateEMA } from '../indicators';

describe('Technical Indicators (SMA & EMA)', () => {
    it('calculates SMA correctly', () => {
        const data = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
        const sma = calculateSMA(data, 3);
        expect(Math.abs(sma[2]! - 11)).toBeLessThan(0.01);
        expect(Math.abs(sma[9]! - 18)).toBeLessThan(0.01);
    });

    it('calculates EMA correctly', () => {
        const data = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
        const ema = calculateEMA(data, 3);
        expect(Math.abs(ema[2]! - 11)).toBeLessThan(0.01);
        expect(Math.abs(ema[3]! - 12)).toBeLessThan(0.01);
    });
});
