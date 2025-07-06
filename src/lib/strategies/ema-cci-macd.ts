
'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateEMA, calculateCCI, calculateMACD } from '@/lib/indicators';

export interface EmaCciMacdParams {
  emaPeriod: number;
  cciPeriod: number;
  cciLevel: number;
  macdShortPeriod: number;
  macdLongPeriod: number;
  macdSignalPeriod: number;
}

export const defaultEmaCciMacdParams: EmaCciMacdParams = {
  emaPeriod: 100,
  cciPeriod: 14,
  cciLevel: 100,
  macdShortPeriod: 12,
  macdLongPeriod: 26,
  macdSignalPeriod: 9,
};

const emaCciMacdStrategy: Strategy = {
  id: 'ema-cci-macd',
  name: 'EMA-CCI-MACD Triple Confirmation',
  description: 'A trend-following strategy combining EMA for trend, CCI for pullbacks, and MACD for momentum confirmation.',
  async calculate(data: HistoricalData[], params: EmaCciMacdParams = defaultEmaCciMacdParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const requiredDataLength = Math.max(params.emaPeriod, params.cciPeriod, params.macdLongPeriod + params.macdSignalPeriod);

    if (data.length < requiredDataLength) return dataWithIndicators;

    const closePrices = data.map(d => d.close);
    const trendEma = calculateEMA(closePrices, params.emaPeriod);
    const cci = calculateCCI(data, params.cciPeriod);
    const { histogram: macdHistogram } = calculateMACD(closePrices, params.macdShortPeriod, params.macdLongPeriod, params.macdSignalPeriod);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.ema_long = trendEma[i]; // Use ema_long for the trend EMA visualization
      d.cci = cci[i];
      d.macd_hist = macdHistogram[i];
      
      if (i < 1) return;

      const prevCci = cci[i - 1];
      const currentCci = cci[i];
      const prevTrendEma = trendEma[i - 1];
      const prevMacdHist = macdHistogram[i - 1];
      
      if (prevCci === null || currentCci === null || prevTrendEma === null || prevMacdHist === null) {
        return;
      }

      // --- BUY Trade Logic ---
      // Check for CCI crossing back up from oversold territory.
      const cciBuyCross = prevCci <= -params.cciLevel && currentCci > -params.cciLevel;
      if (cciBuyCross) {
        // Confirm the overall trend and momentum were bullish on the *previous* candle,
        // just before the CCI cross, to ensure we are buying a pullback in an uptrend.
        const wasInUptrend = data[i-1].close > prevTrendEma;
        const wasMacdBullish = prevMacdHist > 0;

        if (wasInUptrend && wasMacdBullish) {
          d.buySignal = d.low;
        }
      }
      
      // --- SELL Trade Logic ---
      // Check for CCI crossing back down from overbought territory.
      const cciSellCross = prevCci >= params.cciLevel && currentCci < params.cciLevel;
       if (cciSellCross) {
        // Confirm the overall trend and momentum were bearish on the *previous* candle,
        // just before the CCI cross, to ensure we are selling a rally in a downtrend.
        const wasInDowntrend = data[i-1].close < prevTrendEma;
        const wasMacdBearish = prevMacdHist < 0;

        if (wasInDowntrend && wasMacdBearish) {
          d.sellSignal = d.high;
        }
      }
    });

    return dataWithIndicators;
  },
};

export default emaCciMacdStrategy;
