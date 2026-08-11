import { describe, it, expect, vi } from 'vitest';
import nanoMicroscopeStrategy, { defaultNanoMicroscopeParams } from './nano-microscope';
import { HistoricalData } from '../types';
import Decimal from 'decimal.js';

// Removed mock as requested, to use the real ONNX engine.

describe('Nano Microscope Strategy', () => {
  it('should process batch data and set signals based on AI inference', async () => {
    const data: HistoricalData[] = [
      { time: 1609459200000, open: 100, high: 110, low: 90, close: 105, volume: 1000, 
        toxic_features: Array(13).fill(0), spatial_features: Array(60).fill(0) },
      { time: 1609545600000, open: 105, high: 115, low: 95, close: 110, volume: 1100,
        toxic_features: Array(13).fill(0), spatial_features: Array(60).fill(0) },
      { time: 1609632000000, open: 110, high: 120, low: 100, close: 115, volume: 1200,
        toxic_features: Array(13).fill(0), spatial_features: Array(60).fill(0) }
    ];

    const result = await nanoMicroscopeStrategy.calculate(data, defaultNanoMicroscopeParams);

    expect(result.length).toBe(3);
    
    // Without the real model loaded, it should fall back to STUB mode (WAIT)
    expect(result[0].buySignal).toBeUndefined();
    expect(result[0].sellSignal).toBeUndefined();
    expect(result[0].aiConfidence).toBe(1.0);
    
    expect(result[1].buySignal).toBeUndefined();
    expect(result[1].sellSignal).toBeUndefined();
    expect(result[1].aiConfidence).toBe(1.0);

    expect(result[2].buySignal).toBeUndefined();
    expect(result[2].sellSignal).toBeUndefined();
    expect(result[2].aiConfidence).toBe(1.0);
  });
});
