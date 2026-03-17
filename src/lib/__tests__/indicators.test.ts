import { calculateSMA, calculateEMA, calculatePivotPoints } from '../indicators';
import { HistoricalData } from '../types';

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

    const histData: HistoricalData[] = [
        { time: 1, open: 10, high: 15, low: 5, close: 12, volume: 100 },
        { time: 2, open: 12, high: 18, low: 10, close: 15, volume: 110 },
        { time: 3, open: 15, high: 20, low: 12, close: 17, volume: 120 },
        { time: 4, open: 17, high: 22, low: 15, close: 20, volume: 130 },
        { time: 5, open: 20, high: 25, low: 18, close: 22, volume: 140 },
    ];
    // Period 2:
    // i=0, 1: null
    // i=2: slice(0, 2) -> high=18, low=5, close=15. PP=(18+5+15)/3 = 12.666
    // i=3: slice(1, 3) -> high=20, low=10, close=17. PP=(20+10+17)/3 = 15.666
    // i=4: slice(2, 4) -> high=22, low=12, close=20. PP=(22+12+20)/3 = 18.0
    const pivots = calculatePivotPoints(histData, 2);
    if (pivots.pp[2] === null || Math.abs(pivots.pp[2] - 12.666) > 0.001) throw new Error('Pivot PP index 2 mismatch');
    if (pivots.pp[3] === null || Math.abs(pivots.pp[3] - 15.666) > 0.001) throw new Error('Pivot PP index 3 mismatch');
    if (pivots.pp[4] === null || Math.abs(pivots.pp[4] - 18.0) > 0.001) throw new Error('Pivot PP index 4 mismatch');
    console.log('Pivot Points Test Passed');

    console.log('All Manual Unit Tests Passed');
} catch (e) {
    console.error('Test Failed:', e);
    process.exit(1);
}
