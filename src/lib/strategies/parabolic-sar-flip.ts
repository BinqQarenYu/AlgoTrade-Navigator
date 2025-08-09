'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateParabolicSAR } from '@/lib/indicators';

export interface ParabolicSarFlipParams {
  afStart: number;
  afIncrement: number;
  afMax: number;
}

export const defaultParabolicSarFlipParams: ParabolicSarFlipParams = {
  afStart: 0.02,
  afIncrement: 0.02,
  afMax: 0.2,
};

const parabolicSarFlipStrategy: Strategy = {
  id: 'parabolic-sar-flip',
  name: 'Parabolic SAR Flip',
  description: 'A trend-following strategy that enters a trade when the Parabolic SAR dots flip from one side of the price to the other.',
  async calculate(data: HistoricalData[], params: ParabolicSarFlipParams = defaultParabolicSarFlipParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < 2) return dataWithIndicators;

    const { psar, direction } = calculateParabolicSAR(data, params.afStart, params.afIncrement, params.afMax);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.psar = psar[i];
      d.psar_direction = direction[i];
      d.signal = null;

      if (i > 0 && direction[i-1] !== null && direction[i] !== null) {
        // SAR flips from below to above (end of uptrend) -> Sell signal
        if (direction[i-1] === 1 && direction[i] === -1) {
          d.signal = 'SELL';
        }
        // SAR flips from above to below (end of downtrend) -> Buy signal
        if (direction[i-1] === -1 && direction[i] === 1) {
          d.signal = 'BUY';
        }
      }
    });

    return dataWithIndicators;
  },
};

export default parabolicSarFlipStrategy;
