
'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateHeikinAshi } from '@/lib/indicators';

const heikinAshiTrendStrategy: Strategy = {
  id: 'heikin-ashi-trend',
  name: 'Heikin-Ashi Trend',
  description: 'Uses smoothed Heikin-Ashi candles to identify strong trends and generates signals on trend reversals.',
  async calculate(data: HistoricalData[]): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    
    if (data.length < 2) return dataWithIndicators;

    const haData = calculateHeikinAshi(data);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.ha_open = haData[i].ha_open;
      d.ha_high = haData[i].ha_high;
      d.ha_low = haData[i].ha_low;
      d.ha_close = haData[i].ha_close;

      if (i > 0) {
        const prevHa = haData[i-1];
        const currentHa = haData[i];

        const prevIsBearish = prevHa.ha_close! < prevHa.ha_open!;
        const prevIsBullish = prevHa.ha_close! > prevHa.ha_open!;
        const currentIsBullish = currentHa.ha_close! > currentHa.ha_open!;
        const currentIsBearish = currentHa.ha_close! < currentHa.ha_open!;

        d.signal = null;
        // Buy Signal: Trend flips from bearish to bullish
        if (prevIsBearish && currentIsBullish) {
            d.signal = 'BUY';
        }

        // Sell Signal: Trend flips from bullish to bearish
        if (prevIsBullish && currentIsBearish) {
            d.signal = 'SELL';
        }
      }
    });

    return dataWithIndicators;
  },
};

export default heikinAshiTrendStrategy;
