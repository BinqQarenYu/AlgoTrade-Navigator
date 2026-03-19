import { calculateCCI } from './src/lib/indicators';

const data = Array.from({ length: 50000 }, (_, i) => ({
    time: i,
    open: Math.random() * 100,
    high: Math.random() * 100 + 50,
    low: Math.random() * 100,
    close: Math.random() * 100,
    volume: Math.random() * 1000
}));

console.time('calculateCCI old');
const calculateCCIOld = (data, period) => {
    const cci = [];
    const typicalPrices = data.map(d => (d.high + d.low + d.close) / 3);
    const smaTp = calculateSMA(typicalPrices, period);

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1 || smaTp[i] === null) {
            cci.push(null);
            continue;
        }
        const slice = typicalPrices.slice(i - period + 1, i + 1);
        const meanDeviation = slice.reduce((sum, val) => sum + Math.abs(val - smaTp[i]), 0) / period;
        const val = (typicalPrices[i] - smaTp[i]) / (0.015 * meanDeviation);
        cci.push(meanDeviation > 0 ? val : 0);
    }
    return cci;
};
const calculateSMA = (data, period) => {
  if (period <= 0 || !Number.isInteger(period)) {
    console.error(`Invalid period (${period}) provided to calculateSMA.`);
    return Array(data.length).fill(null);
  }
  if (data.length < period) return Array(data.length).fill(null);

  const sma = Array(period - 1).fill(null);
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  sma.push(sum / period);

  for (let i = period; i < data.length; i++) {
    sum = sum - data[i - period] + data[i];
    sma.push(sum / period);
  }

  return sma;
};
calculateCCIOld(data, 100);
console.timeEnd('calculateCCI old');

console.time('calculateCCI new');

const calculateCCINew = (data, period) => {
    const cci = [];
    const typicalPrices = data.map(d => (d.high + d.low + d.close) / 3);
    const smaTp = calculateSMA(typicalPrices, period);

    // Keep track of elements in the rolling window using queue or just an array that we can iterate.
    // Well, computing mean deviation effectively takes O(P) so CCI overall takes O(N*P).
    // Can we optimize to O(N)? Let's just avoid `slice()` inside the loop for now. It should be faster.
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1 || smaTp[i] === null) {
            cci.push(null);
            continue;
        }
        // slice is O(P)
        let sumDev = 0;
        const currentSma = smaTp[i];
        for (let j = 0; j < period; j++) {
            sumDev += Math.abs(typicalPrices[i - period + 1 + j] - currentSma);
        }
        const meanDeviation = sumDev / period;
        const val = (typicalPrices[i] - currentSma) / (0.015 * meanDeviation);
        cci.push(meanDeviation > 0 ? val : 0);
    }
    return cci;
};
calculateCCINew(data, 100);
console.timeEnd('calculateCCI new');

const resOld = calculateCCIOld(data, 100);
const resNew = calculateCCINew(data, 100);
console.log('Correctness: ', JSON.stringify(resOld) === JSON.stringify(resNew));
