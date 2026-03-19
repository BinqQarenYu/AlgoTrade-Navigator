import { calculatePivotPoints, calculateSlidingWindowExtreme } from './src/lib/indicators';

const data = Array.from({ length: 50000 }, (_, i) => ({
    time: i,
    open: Math.random() * 100,
    high: Math.random() * 100 + 50,
    low: Math.random() * 100,
    close: Math.random() * 100,
    volume: Math.random() * 1000
}));

console.time('Old calculatePivotPoints');
// The original one we'll copy directly into this file
const calculatePivotPointsOld = (data, period) => {
    const pp = [];
    const s1 = [];
    const s2 = [];
    const s3 = [];
    const r1 = [];
    const r2 = [];
    const r3 = [];

    for (let i = 0; i < data.length; i++) {
        if (i < period) {
            pp.push(null);
            s1.push(null);
            s2.push(null);
            s3.push(null);
            r1.push(null);
            r2.push(null);
            r3.push(null);
        } else {
            const slice = data.slice(i - period, i);
            if (slice.length === 0 || !slice[slice.length - 1]) {
                 pp.push(null);
                 s1.push(null);
                 s2.push(null);
                 s3.push(null);
                 r1.push(null);
                 r2.push(null);
                 r3.push(null);
                 continue;
            }

            const high = Math.max(...slice.map(d => d.high));
            const low = Math.min(...slice.map(d => d.low));
            const close = slice[slice.length - 1].close;

            const ppVal = (high + low + close) / 3;
            const r1Val = (2 * ppVal) - low;
            const s1Val = (2 * ppVal) - high;
            const r2Val = ppVal + (high - low);
            const s2Val = ppVal - (high - low);
            const r3Val = high + 2 * (ppVal - low);
            const s3Val = low - 2 * (high - ppVal);

            pp.push(ppVal);
            r1.push(r1Val);
            s1.push(s1Val);
            r2.push(r2Val);
            s2.push(s2Val);
            r3.push(r3Val);
            s3.push(s3Val);
        }
    }
    return { pp, s1, s2, s3, r1, r2, r3 };
};

const calculatePivotPointsNew = (data, period) => {
    const pp = [];
    const s1 = [];
    const s2 = [];
    const s3 = [];
    const r1 = [];
    const r2 = [];
    const r3 = [];

    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const periodHighs = calculateSlidingWindowExtreme(highs, period, 'max');
    const periodLows = calculateSlidingWindowExtreme(lows, period, 'min');

    for (let i = 0; i < data.length; i++) {
        if (i < period) {
            pp.push(null);
            s1.push(null);
            s2.push(null);
            s3.push(null);
            r1.push(null);
            r2.push(null);
            r3.push(null);
        } else {
            const high = periodHighs[i - 1];
            const low = periodLows[i - 1];

            if (high === null || low === null) {
                 pp.push(null);
                 s1.push(null);
                 s2.push(null);
                 s3.push(null);
                 r1.push(null);
                 r2.push(null);
                 r3.push(null);
                 continue;
            }

            const close = data[i - 1].close;

            const ppVal = (high + low + close) / 3;
            const r1Val = (2 * ppVal) - low;
            const s1Val = (2 * ppVal) - high;
            const r2Val = ppVal + (high - low);
            const s2Val = ppVal - (high - low);
            const r3Val = high + 2 * (ppVal - low);
            const s3Val = low - 2 * (high - ppVal);

            pp.push(ppVal);
            r1.push(r1Val);
            s1.push(s1Val);
            r2.push(r2Val);
            s2.push(s2Val);
            r3.push(r3Val);
            s3.push(s3Val);
        }
    }
    return { pp, s1, s2, s3, r1, r2, r3 };
}

calculatePivotPointsOld(data, 100);
console.timeEnd('Old calculatePivotPoints');

console.time('New calculatePivotPoints');
calculatePivotPointsNew(data, 100);
console.timeEnd('New calculatePivotPoints');

// check correctness
const oldRes = calculatePivotPointsOld(data, 10);
const newRes = calculatePivotPointsNew(data, 10);

console.log('Correctness Check:', JSON.stringify(oldRes.pp) === JSON.stringify(newRes.pp));
