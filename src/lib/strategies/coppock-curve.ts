'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateCoppockCurve } from '@/lib/indicators';

export interface CoppockCurveParams {
  longRoC: number;
  shortRoC: number;
  wmaPeriod: number;
}

export const defaultCoppockCurveParams: CoppockCurveParams = {
  longRoC: 14,
  shortRoC: 11,
  wmaPeriod: 10,
};

const coppockCurveStrategy: Strategy = {
  id: 'coppock-curve',
  name: 'Coppock Curve',
  description: 'A long-term momentum indicator. Signals are generated when the curve moves from negative to positive.',
  async calculate(data: HistoricalData[], params: CoppockCurveParams = defaultCoppockCurveParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const requiredData = params.longRoC + params.wmaPeriod;

    if (data.length < requiredData) return dataWithIndicators;

    const closePrices = data.map(d => d.close);
    const coppock = calculateCoppockCurve(closePrices, params.longRoC, params.shortRoC, params.wmaPeriod);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.coppock = coppock[i];
      if (i > 0 && coppock[i-1] !== null && coppock[i] !== null) {
        // Buy Signal: Curve crosses above zero
        if (coppock[i-1]! <= 0 && coppock[i]! > 0) {
          d.buySignal = d.low;
        }
        // Sell Signal: Curve crosses below zero
        if (coppock[i-1]! >= 0 && coppock[i]! < 0) {
          d.sellSignal = d.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default coppockCurveStrategy;
