
import { calculatePivotPoints, calculateCCI } from './indicators';
import { HistoricalData } from './types';

const generateData = (n: number): HistoricalData[] => {
  const data: HistoricalData[] = [];
  let price = 100;
  for (let i = 0; i < n; i++) {
    const change = (Math.random() - 0.5) * 2;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random();
    const low = Math.min(open, close) - Math.random();
    data.push({
      time: i,
      open,
      high,
      low,
      close,
      volume: Math.random() * 1000
    });
    price = close;
  }
  return data;
};

const n = 10000;
const period = 200;
const data = generateData(n);

console.log(`Benchmarking indicators with N=${n}, P=${period}...`);

const startPP = performance.now();
calculatePivotPoints(data, period);
const endPP = performance.now();
console.log(`calculatePivotPoints: ${(endPP - startPP).toFixed(2)}ms`);

const startCCI = performance.now();
calculateCCI(data, period);
const endCCI = performance.now();
console.log(`calculateCCI: ${(endCCI - startCCI).toFixed(2)}ms`);
