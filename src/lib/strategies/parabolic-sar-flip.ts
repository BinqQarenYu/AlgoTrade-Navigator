
'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateParabolicSAR } from '@/lib/indicators';

const parabolicSarFlipStrategy: Strategy = {
  id: 'parabolic-sar-flip',
  name: 'Parabolic SAR Flip',
  description: 'A trend-following strategy that enters a trade when the Parabolic SAR dots flip from one side of the price to the other.',
  async calculate(data: HistoricalData[]): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const afStart = 0.02;
    const afIncrement = 0.02;
    const afMax = 0.2;

    if (data.length < 2) return dataWithIndicators;

    const { psar, direction } = calculateParabolicSAR(data, afStart, afIncrement, afMax);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.psar = psar[i];
      d.psar_direction = direction[i];

      if (i > 0 && direction[i-1] !== null && direction[i] !== null) {
        // SAR flips from below to above (end of uptrend) -> Sell signal
        if (direction[i-1] === 1 && direction[i] === -1) {
          d.sellSignal = d.high;
        }
        // SAR flips from above to below (end of downtrend) -> Buy signal
        if (direction[i-1] === -1 && direction[i] === 1) {
          d.buySignal = d.low;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default parabolicSarFlipStrategy;
