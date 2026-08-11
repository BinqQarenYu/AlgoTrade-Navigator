'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateSmoothedHeikinAshi, calculateSemafor, calculateEMA, calculateRSI } from '@/lib/indicators';

export interface SemaforSmoothedHAParams {
    semaforPeriods: [number, number, number];
    smoothedHaPeriod: number;
    useFilters: boolean;
    emaFilterPeriod: number;
    rsiPeriod: number;
    signalLookback: number;
    discipline: DisciplineParams;
}

export const defaultSemaforSmoothedHAParams: SemaforSmoothedHAParams = {
    semaforPeriods: [5, 13, 34],
    smoothedHaPeriod: 10,
    useFilters: true,
    emaFilterPeriod: 50,
    rsiPeriod: 14,
    signalLookback: 10,
    discipline: {
        enableDiscipline: true,
        maxConsecutiveLosses: 4,
        cooldownPeriodMinutes: 15,
        dailyDrawdownLimit: 10,
        onFailure: 'Cooldown',
    },
};

const semaforSmoothedHAStrategy: Strategy = {
  id: 'semafor-smoothed-ha',
  name: '3x Semafor & Smoothed HA',
  description: 'Uses 3x Semafor (ZigZag) to find major reversal points (Level 3), and Smoothed Heikin Ashi color flips as entry triggers.',
  async calculate(data: HistoricalData[], params: SemaforSmoothedHAParams = defaultSemaforSmoothedHAParams): Promise<HistoricalData[]> {
    const dataWithIndicators = data.map(d => ({ ...d }));
    
    if (data.length < Math.max(params.emaFilterPeriod, params.smoothedHaPeriod, params.semaforPeriods[2])) return dataWithIndicators;

    const smoothedHaData = calculateSmoothedHeikinAshi(data, params.smoothedHaPeriod);
    const semaforData = calculateSemafor(data, params.semaforPeriods[0], params.semaforPeriods[1], params.semaforPeriods[2]);
    
    const closes = data.map(d => d.close);
    const ema = calculateEMA(closes, params.emaFilterPeriod);
    const rsi = calculateRSI(closes, params.rsiPeriod);

    let lastL3BottomIdx = -1;
    let lastL3TopIdx = -1;

    for (let i = 1; i < data.length; i++) {
        // Record Semafor Level 3 occurrence
        if (semaforData[i].level3Bottom) lastL3BottomIdx = i;
        if (semaforData[i].level3Top) lastL3TopIdx = i;

        // Skip if we don't have valid smoothed HA data yet
        if (smoothedHaData[i-1].ha_open === null || smoothedHaData[i].ha_open === null) continue;

        const prevHa = smoothedHaData[i-1];
        const currHa = smoothedHaData[i];

        const prevIsBearish = prevHa.ha_close! <= prevHa.ha_open!;
        const currIsBullish = currHa.ha_close! > currHa.ha_open!;

        const prevIsBullish = prevHa.ha_close! >= prevHa.ha_open!;
        const currIsBearish = currHa.ha_close! < currHa.ha_open!;

        const bullishFlip = prevIsBearish && currIsBullish;
        const bearishFlip = prevIsBullish && currIsBearish;

        let buySignal = false;
        let sellSignal = false;

        // Check for Buy Condition
        if (bullishFlip && lastL3BottomIdx !== -1 && (i - lastL3BottomIdx) <= params.signalLookback) {
            buySignal = true;
            if (params.useFilters) {
                if (ema[i] !== null && data[i].close < ema[i]!) buySignal = false;
                if (rsi[i] !== null && rsi[i]! < 50) buySignal = false; // Need momentum backing the reversal
            }
        }

        // Check for Sell Condition
        if (bearishFlip && lastL3TopIdx !== -1 && (i - lastL3TopIdx) <= params.signalLookback) {
            sellSignal = true;
            if (params.useFilters) {
                if (ema[i] !== null && data[i].close > ema[i]!) sellSignal = false;
                if (rsi[i] !== null && rsi[i]! > 50) sellSignal = false;
            }
        }

        if (buySignal) {
            dataWithIndicators[i].buySignal = data[i].low;
            lastL3BottomIdx = -1; // Reset to avoid multiple entries on the same semafor
        }
        if (sellSignal) {
            dataWithIndicators[i].sellSignal = data[i].high;
            lastL3TopIdx = -1;
        }
    }

    return dataWithIndicators;
  },
};

export default semaforSmoothedHAStrategy;
