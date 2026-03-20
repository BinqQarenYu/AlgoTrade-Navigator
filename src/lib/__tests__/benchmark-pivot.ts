
import { calculatePivotPoints } from '../indicators';
import { HistoricalData } from '../types';

function generateMockData(count: number): HistoricalData[] {
  const data: HistoricalData[] = [];
  let basePrice = 100;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 2;
    basePrice += change;
    data.push({
      time: i * 60 * 1000,
      open: basePrice,
      high: basePrice + Math.random(),
      low: basePrice - Math.random(),
      close: basePrice + (Math.random() - 0.5),
      volume: Math.random() * 1000,
    });
  }
  return data;
}

const DATA_SIZE = 10000;
const PERIOD = 200;
const ITERATIONS = 10;

console.log(`Benchmarking calculatePivotPoints with ${DATA_SIZE} points and period ${PERIOD}...`);
const data = generateMockData(DATA_SIZE);

let totalTime = 0;
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  calculatePivotPoints(data, PERIOD);
  const end = performance.now();
  totalTime += (end - start);
}

console.log(`Average execution time over ${ITERATIONS} iterations: ${(totalTime / ITERATIONS).toFixed(2)}ms`);
