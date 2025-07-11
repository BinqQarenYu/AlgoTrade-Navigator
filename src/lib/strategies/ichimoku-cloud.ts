'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateIchimokuCloud } from '@/lib/indicators';

export interface IchimokuCloudParams {
  tenkanPeriod: number;
  kijunPeriod: number;
  senkouBPeriod: number;
  displacement: number;
  reverse?: boolean;
}

export const defaultIchimokuCloudParams: IchimokuCloudParams = {
  tenkanPeriod: 9,
  kijunPeriod: 26,
  senkouBPeriod: 52,
  displacement: 26,
  reverse: false,
};

const ichimokuCloudStrategy: Strategy = {
  id: 'ichimoku-cloud',
  name: 'Ichimoku Cloud',
  description: 'A comprehensive trend-following system. This strategy uses the Tenkan/Kijun cross confirmed by the Kumo (cloud).',
  async calculate(data: HistoricalData[], params: IchimokuCloudParams = defaultIchimokuCloudParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));

    if (data.length < params.senkouBPeriod + params.displacement) return dataWithIndicators;
    
    // Calculate all components for visualization
    const ichimoku = calculateIchimokuCloud(data, params.tenkanPeriod, params.kijunPeriod, params.senkouBPeriod, params.displacement);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.tenkan_sen = ichimoku.tenkan[i];
      d.kijun_sen = ichimoku.kijun[i];
      d.senkou_a = ichimoku.senkouA[i];
      d.senkou_b = ichimoku.senkouB[i];
      d.chikou_span = ichimoku.chikou[i];
    });

    // Strategy Logic (requires looking back for Kumo)
    for (let i = params.kijunPeriod + params.displacement; i < data.length; i++) {
        const d = dataWithIndicators[i];
        const prev_d = dataWithIndicators[i - 1];

        // Values for current candle 'i'
        const tenkan_current = d.tenkan_sen;
        const kijun_current = d.kijun_sen;
        const tenkan_prev = prev_d.tenkan_sen;
        const kijun_prev = prev_d.kijun_sen;

        // Kumo values at current candle 'i'. These were calculated `displacement` periods ago.
        const senkou_a_current = d.senkou_a;
        const senkou_b_current = d.senkou_b;
        
        if (!tenkan_current || !kijun_current || !tenkan_prev || !kijun_prev || !senkou_a_current || !senkou_b_current) {
            continue;
        }

        const bullish_tk_cross = tenkan_prev <= kijun_prev && tenkan_current > kijun_current;
        const bearish_tk_cross = tenkan_prev >= kijun_prev && tenkan_current < kijun_current;

        const price = d.close;
        const isAboveKumo = price > senkou_a_current && price > senkou_b_current;
        const isBelowKumo = price < senkou_a_current && price < senkou_b_current;

        // Buy Signal: Bullish TK cross happens while price is above the Kumo
        const standardBuy = bullish_tk_cross && isAboveKumo;

        // Sell Signal: Bearish TK cross happens while price is below the Kumo
        const standardSell = bearish_tk_cross && isBelowKumo;

        if (params.reverse) {
            if (standardBuy) d.sellSignal = d.high;
            if (standardSell) d.buySignal = d.low;
        } else {
            if (standardBuy) d.buySignal = d.low;
            if (standardSell) d.sellSignal = d.high;
        }
    }

    return dataWithIndicators;
  },
};

export default ichimokuCloudStrategy;
