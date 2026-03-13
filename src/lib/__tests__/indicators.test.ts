import { calculateSMA, calculateEMA } from '../indicators';

console.log('Running Manual Unit Tests...');
try {
    const data = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
    const sma = calculateSMA(data, 3);
    if (Math.abs(sma[2]! - 11) > 0.01) throw new Error('SMA index 2 mismatch');
    if (Math.abs(sma[9]! - 18) > 0.01) throw new Error('SMA index 9 mismatch');
    console.log('SMA Test Passed');

    const ema = calculateEMA(data, 3);
    if (Math.abs(ema[2]! - 11) > 0.01) throw new Error('EMA index 2 mismatch');
    if (Math.abs(ema[3]! - 12) > 0.01) throw new Error('EMA index 3 mismatch');
    console.log('EMA Test Passed');

    console.log('All Manual Unit Tests Passed');
} catch (e) {
    console.error('Test Failed:', e);
    process.exit(1);
}
