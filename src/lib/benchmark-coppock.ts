import { calculateCoppockCurve } from './indicators';
import { performance } from 'perf_hooks';

const data = Array.from({ length: 100000 }, (_, i) => 100 + Math.random() * 50);

console.log('Benchmarking calculateCoppockCurve with 10,000 data points...');

const start = performance.now();
const result = calculateCoppockCurve(data, 14, 11, 10);
const end = performance.now();

console.log(`Execution time: ${(end - start).toFixed(2)}ms`);
console.log(`Result length: ${result.length}`);
console.log(`First 20 values: ${JSON.stringify(result.slice(0, 20))}`);
console.log(`Last 5 values: ${JSON.stringify(result.slice(-5))}`);
