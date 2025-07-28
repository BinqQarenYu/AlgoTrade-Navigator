'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculatePivotPoints } from '@/lib/indicators';

export interface PivotPointReversalParams {
  period: number;
  discipline: DisciplineParams;
}

export const defaultPivotPointReversalParams: PivotPointReversalParams = {
  period: 24,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const pivotPointReversalStrategy: Strategy = {
  id: 'pivot-point-reversal',
  name: 'Pivot Point Reversal',
  description: 'Trades reversals off of calculated support (S1, S2, S3) and resistance (R1, R2, R3) levels.',
  async calculate(data: HistoricalData[], userParams: Partial<PivotPointReversalParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultPivotPointReversalParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    
    if (data.length < params.period) return dataWithIndicators;

    const { pp, s1, s2, s3, r1, r2, r3 } = calculatePivotPoints(data, params.period);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
        d.pivot_point = pp[i];
        d.s1=s1[i]; d.s2=s2[i]; d.s3=s3[i];
        d.r1=r1[i]; d.r2=r2[i]; d.r3=r3[i];

        if (i > 0) {
            const current = d;
            const prev = dataWithIndicators[i-1];

            const bullishEvent = (s1[i] && prev.low > s1[i]! && current.low <= s1[i]! && current.close > s1[i]!) ||
                (s2[i] && prev.low > s2[i]! && current.low <= s2[i]! && current.close > s2[i]!) ||
                (s3[i] && prev.low > s3[i]! && current.low <= s3[i]! && current.close > s3[i]!);

            const bearishEvent = (r1[i] && prev.high < r1[i]! && current.high >= r1[i]! && current.close < r1[i]!) ||
                (r2[i] && prev.high < r2[i]! && current.high >= r2[i]! && current.close < r2[i]!) ||
                (r3[i] && prev.high < r3[i]! && current.high >= r3[i]! && current.close < r3[i]!);
            
            if (bullishEvent) d.bullish_event = true;
            if (bearishEvent) d.bearish_event = true;
        }
    });

    return dataWithIndicators;
  },
};

export default pivotPointReversalStrategy;
