'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateOBV, calculateSMA } from '@/lib/indicators';

export interface ObvDivergenceParams {
  period: number;
  reverse?: boolean;
  discipline: DisciplineParams;
}

export const defaultObvDivergenceParams: ObvDivergenceParams = {
  period: 20,
  reverse: false,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 2,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const obvDivergenceStrategy: Strategy = {
  id: 'obv-divergence',
  name: 'OBV Divergence',
  description: 'Identifies potential reversals by comparing On-Balance Volume (OBV) trend with price trend.',
  async calculate(data: HistoricalData[], params: ObvDivergenceParams = defaultObvDivergenceParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.period) return dataWithIndicators;

    const obv = calculateOBV(data);
    const obvSma = calculateSMA(obv.filter(v => v !== null) as number[], params.period);
    const obvSmaPadded = [...Array(data.length - obvSma.length).fill(null), ...obvSma];

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.obv = obv[i];
      if (i > 0 && obv[i-1] !== null && obv[i] !== null && obvSmaPadded[i-1] !== null && obvSmaPadded[i] !== null) {
        const standardBuy = obv[i]! > obvSmaPadded[i]! && obv[i-1]! <= obvSmaPadded[i-1]!;
        const standardSell = obv[i]! < obvSmaPadded[i]! && obv[i-1]! >= obvSmaPadded[i-1]!;
        
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

export default obvDivergenceStrategy;
