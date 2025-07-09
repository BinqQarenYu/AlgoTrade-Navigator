
'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateEMA, calculateCCI, calculateMACD } from '@/lib/indicators';

export interface EmaCciMacdParams {
  emaFastPeriod: number;
  emaMediumPeriod: number;
  emaSlowPeriod: number;
  cciPeriod: number;
  cciLevel: number;
  macdShortPeriod: number;
  macdLongPeriod: number;
  macdSignalPeriod: number;
}

export const defaultEmaCciMacdParams: EmaCciMacdParams = {
  emaFastPeriod: 8,
  emaMediumPeriod: 13,
  emaSlowPeriod: 50,
  cciPeriod: 14,
  cciLevel: 100,
  macdShortPeriod: 12,
  macdLongPeriod: 26,
  macdSignalPeriod: 9,
};

const emaCciMacdStrategy: Strategy = {
  id: 'ema-cci-macd',
  name: 'EMA-CCI-MACD Triple Confirmation',
  description: 'A trend-following strategy combining stacked EMAs for trend, CCI for pullbacks, and MACD for momentum confirmation.',
  async calculate(data: HistoricalData[], params: EmaCciMacdParams = defaultEmaCciMacdParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const requiredDataLength = Math.max(params.emaSlowPeriod, params.cciPeriod, params.macdLongPeriod + params.macdSignalPeriod);

    if (data.length < requiredDataLength) return dataWithIndicators;

    const closePrices = data.map(d => d.close);
    const emaFast = calculateEMA(closePrices, params.emaFastPeriod);
    const emaMedium = calculateEMA(closePrices, params.emaMediumPeriod);
    const emaSlow = calculateEMA(closePrices, params.emaSlowPeriod);
    const cci = calculateCCI(data, params.cciPeriod);
    const { histogram: macdHistogram } = calculateMACD(closePrices, params.macdShortPeriod, params.macdLongPeriod, params.macdSignalPeriod);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.ema_short = emaFast[i];
      d.ema_medium = emaMedium[i];
      d.ema_long = emaSlow[i];
      d.cci = cci[i];
      d.macd_hist = macdHistogram[i];
      
      if (i < 1) return;

      const prevEmaFast = emaFast[i - 1];
      const prevEmaMedium = emaMedium[i - 1];
      const prevEmaSlow = emaSlow[i - 1];
      const prevCci = cci[i - 1];
      const currentCci = cci[i];
      const prevMacdHist = macdHistogram[i - 1];
      
      if (prevEmaFast === null || prevEmaMedium === null || prevEmaSlow === null || prevCci === null || currentCci === null || prevMacdHist === null) {
        return;
      }

      // --- BUY Trade Logic ---
      // Trend Confirmation: Fast EMA is above Medium, which is above Slow
      const wasInUptrend = prevEmaFast > prevEmaMedium && prevEmaMedium > prevEmaSlow;
      // Pullback Confirmation: CCI crosses back up from oversold territory.
      const cciBuyCross = prevCci <= -params.cciLevel && currentCci > -params.cciLevel;
      // Momentum Confirmation: MACD histogram is positive.
      const wasMacdBullish = prevMacdHist > 0;
      
      if (wasInUptrend && cciBuyCross && wasMacdBullish) {
          d.buySignal = d.low;
      }
      
      // --- SELL Trade Logic ---
      // Trend Confirmation: Fast EMA is below Medium, which is below Slow
      const wasInDowntrend = prevEmaFast < prevEmaMedium && prevEmaMedium < prevEmaSlow;
      // Pullback Confirmation: CCI crosses back down from overbought territory.
      const cciSellCross = prevCci >= params.cciLevel && currentCci < params.cciLevel;
      // Momentum Confirmation: MACD histogram is negative.
      const wasMacdBearish = prevMacdHist < 0;

      if (wasInDowntrend && cciSellCross && wasMacdBearish) {
        d.sellSignal = d.high;
      }
    });

    return dataWithIndicators;
  },
};

export default emaCciMacdStrategy;
