'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateParabolicSAR } from '@/lib/indicators';

export interface ParabolicSarFlipParams {
  afStart: number;
  afIncrement: number;
  afMax: number;
  reverse?: boolean;
}

export const defaultParabolicSarFlipParams: ParabolicSarFlipParams = {
  afStart: 0.02,
  afIncrement: 0.02,
  afMax: 0.2,
  reverse: false,
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

      if (i > 0 && direction[i-1] !== null && direction[i] !== null) {
        // SAR flips from above to below (end of downtrend) -> Buy signal
        const standardBuy = direction[i-1] === -1 && direction[i] === 1;
        // SAR flips from below to above (end of uptrend) -> Sell signal
        const standardSell = direction[i-1] === 1 && direction[i] === -1;

        if (params.reverse) {
            if (standardBuy) d.sellSignal = d.high;
            if (standardSell) d.buySignal = d.low;
        } else {
            if (standardBuy) d.buySignal = d.low;
            if (standardSell) d.sellSignal = d.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default parabolicSarFlipStrategy;
