import { describe, it, expect } from 'vitest';
import { formatPrice } from '../utils';

describe('formatPrice', () => {
    // Basic zeroes and nullish
    it('returns "0.00" for 0', () => {
        expect(formatPrice(0)).toBe('0.00');
    });

    it('returns "0.00" for undefined', () => {
        expect(formatPrice(undefined as any)).toBe('0.00');
    });

    it('returns "0.00" for null', () => {
        expect(formatPrice(null as any)).toBe('0.00');
    });

    // Large numbers (> 1000)
    it('formats large numbers (e.g. BTC) with 2 decimal places and commas', () => {
        expect(formatPrice(65432.123)).toBe('65,432.12');
        expect(formatPrice(1001)).toBe('1,001.00');
    });

    // Medium numbers (10 to 1000)
    it('formats medium numbers (e.g. SOL) with 4 decimal places and commas if > 1', () => {
        expect(formatPrice(150.12345)).toBe('150.1235');
        expect(formatPrice(11.1)).toBe('11.1000');
    });

    // Small numbers (0.1 to 10)
    it('formats small numbers (e.g. ADA) with 5 decimal places', () => {
        expect(formatPrice(1.5)).toBe('1.50000');
        expect(formatPrice(0.15)).toBe('0.15000');
    });

    // Very small numbers (0.0001 to 0.1)
    it('formats very small numbers (e.g. SHIB) with 8 decimal places', () => {
        expect(formatPrice(0.001234567)).toBe('0.00123457');
        expect(formatPrice(0.00015)).toBe('0.00015000');
    });

    // Micro numbers (<= 0.0001)
    it('formats micro numbers (e.g. PEPE) with 10 decimal places', () => {
        expect(formatPrice(0.00001234567)).toBe('0.0000123457');
        expect(formatPrice(0.00000001)).toBe('0.0000000100');
    });

    // Negative numbers
    it('formats negative numbers correctly based on their absolute value', () => {
        expect(formatPrice(-5.123)).toBe('-5.1230000000');
        expect(formatPrice(-1500.5)).toBe('-1500.5000000000');
    });
});
