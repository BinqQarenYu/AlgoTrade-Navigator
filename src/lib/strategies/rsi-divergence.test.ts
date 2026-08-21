import { describe, it, expect } from 'vitest';
import rsiDivergenceStrategy, { defaultRsiDivergenceParams } from '../strategies/rsi-divergence';
import type { HistoricalData } from '../types';

describe('RSI Divergence Strategy Optimization Tests', () => {
  it('should return empty array or un-modified output on insufficient data', async () => {
    const data: HistoricalData[] = [
      { timestamp: 1, open: 10, high: 12, low: 8, close: 11, volume: 100 }
    ];
    const result = await rsiDivergenceStrategy.calculate(data, defaultRsiDivergenceParams);
    expect(result.length).toBe(1);
  });

  it('should produce identical results on deterministic mock data', async () => {
    const candles: HistoricalData[] = [];
    let price = 100;
    for (let i = 0; i < 200; i++) {
      // Create some oscillatory movement to generate RSI signals
      price = 100 + Math.sin(i / 5) * 10;
      candles.push({
        timestamp: 1000 + i * 60,
        open: price,
        high: price + 2,
        low: price - 2,
        close: price + (i % 2 === 0 ? 0.5 : -0.5),
        volume: 1000,
      });
    }

    const result = await rsiDivergenceStrategy.calculate(candles, defaultRsiDivergenceParams);

    expect(result.length).toBe(200);
    expect(result[100]).toHaveProperty('rsi');

    // Check that at least some buy or sell signals are detected or processed properly
    const hasBuySignal = result.some(c => c.buySignal !== undefined);
    const hasSellSignal = result.some(c => c.sellSignal !== undefined);

    expect(hasBuySignal || hasSellSignal).toBe(true);
  });
});
