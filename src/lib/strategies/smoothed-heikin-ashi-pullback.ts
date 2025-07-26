
'use client';

import type { HistoricalData, Strategy } from '../types';
import { calculateEMA, calculateHeikinAshi } from '../indicators';

export interface SmoothedHAParams {
    emaPeriod: number;
}

export const defaultSmoothedHAParams: SmoothedHAParams = {
    emaPeriod: 10,
};

const smoothedHeikinAshiPullbackStrategy: Strategy = {
  id: 'smoothed-heikin-ashi-pullback',
  name: 'Smoothed Heikin-Ashi Pullback',
  description: 'Uses Heikin-Ashi candles smoothed by an EMA to identify a strong trend, then enters on a pullback to the EMA.',
  async calculate(data: HistoricalData[], params: SmoothedHAParams = defaultSmoothedHAParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    
    if (data.length < params.emaPeriod) return dataWithIndicators;

    // 1. Create Heikin-Ashi candles
    const haData = calculateHeikinAshi(data);
    const haClosePrices = haData.map(d => d.ha_close as number);

    // 2. Smooth the HA close with an EMA
    const smoothedHA = calculateEMA(haClosePrices, params.emaPeriod);

    // 3. Add to data for visualization
    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.ha_open = haData[i].ha_open;
      d.ha_high = haData[i].ha_high;
      d.ha_low = haData[i].ha_low;
      d.ha_close = haData[i].ha_close;
      d.ema_short = smoothedHA[i]; // Use ema_short for plotting the smoothed line
    });

    // 4. Strategy Logic
    for (let i = 1; i < data.length; i++) {
        const prev = dataWithIndicators[i-1];
        const current = dataWithIndicators[i];
        
        if (!prev.ema_short || !current.ema_short) continue;

        const isTrendingUp = current.ha_close! > current.ema_short;
        const wasTrendingUp = prev.ha_close! > prev.ema_short;

        const isTrendingDown = current.ha_close! < current.ema_short;
        const wasTrendingDown = prev.ha_close! < prev.ema_short;
        
        // Buy on pullback to EMA in an uptrend
        if (wasTrendingUp && current.ha_low! <= current.ema_short && current.ha_close! > current.ema_short) {
            current.buySignal = current.low;
        }

        // Sell on pullback to EMA in a downtrend
        if (wasTrendingDown && current.ha_high! >= current.ema_short && current.ha_close! < current.ema_short) {
            current.sellSignal = current.high;
        }
    }

    return dataWithIndicators;
  },
};

export default smoothedHeikinAshiPullbackStrategy;
