import rsiDivergenceStrategy, { defaultRsiDivergenceParams } from './strategies/rsi-divergence';
import type { HistoricalData } from './types';

function generateMockCandles(count: number): HistoricalData[] {
  const candles: HistoricalData[] = [];
  let price = 100;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.49) * 2;
    price = Math.max(10, price + change);
    const high = price + Math.random() * 2;
    const low = Math.max(1, price - Math.random() * 2);
    const close = low + Math.random() * (high - low);
    candles.push({
      timestamp: Date.now() - (count - i) * 60000,
      open: price,
      high,
      low,
      close,
      volume: 1000 + Math.random() * 500,
    });
  }
  return candles;
}

async function runBenchmark() {
  const sizes = [1000, 5000, 10000, 20000];

  console.log('--- RSI Divergence Strategy Benchmark ---');

  for (const size of sizes) {
    const candles = generateMockCandles(size);

    // Warm up
    await rsiDivergenceStrategy.calculate(candles, defaultRsiDivergenceParams);

    const iterations = 50;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await rsiDivergenceStrategy.calculate(candles, defaultRsiDivergenceParams);
    }
    const totalTime = performance.now() - start;
    const avgTime = totalTime / iterations;

    console.log(`Candles: ${size.toString().padStart(6)} | Avg Time per execution: ${avgTime.toFixed(3)} ms`);
  }
}

runBenchmark().catch(console.error);
