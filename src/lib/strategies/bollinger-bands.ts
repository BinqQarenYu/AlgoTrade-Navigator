'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateBollingerBands } from '@/lib/indicators';

const bollingerBandsStrategy: Strategy = {
  id: 'bollinger-bands',
  name: 'Bollinger Bands Reversion',
  description: 'A mean-reversion strategy that enters trades when price touches an outer band and then reverts towards the middle band.',
  async calculate(data: HistoricalData[]): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const period = 20;
    const stdDev = 2;

    if (data.length < period) return dataWithIndicators;

    const closePrices = data.map(d => d.close);
    const { upper, middle, lower } = calculateBollingerBands(closePrices, period, stdDev);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.bb_upper = upper[i];
      d.bb_middle = middle[i];
      d.bb_lower = lower[i];
      
      if (i > 0 && upper[i-1] && lower[i-1]) {
        const prevBar = data[i-1];
        const currentBar = d;

        // Buy Signal: Price touched or crossed below the lower band, then closed above it.
        if (prevBar.low <= lower[i-1]! && currentBar.close > lower[i]!) {
            d.buySignal = currentBar.low;
        }

        // Sell Signal: Price touched or crossed above the upper band, then closed below it.
        if (prevBar.high >= upper[i-1]! && currentBar.close < upper[i]!) {
            d.sellSignal = currentBar.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default bollingerBandsStrategy;
