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
      const currentMacdHist = macdHistogram[i];
      const currentPrice = d.close;
      const currentTrendEma = trendEma[i];
      
      if (prevCci === null || currentCci === null || currentMacdHist === null || currentTrendEma === null) {
        return;
      }

      // --- BUY Trade Logic ---
      const isInUptrend = currentPrice > currentTrendEma;
      const isMacdBullish = currentMacdHist > 0;
      // Entry Signal: CCI crosses back ABOVE the -100 level
      const cciBuyCross = prevCci <= -params.cciLevel && currentCci > -params.cciLevel;

      if (cciBuyCross && isInUptrend && isMacdBullish) {
        d.buySignal = d.low;
      }
      
      // --- SELL Trade Logic ---
      const isInDowntrend = currentPrice < currentTrendEma;
      const isMacdBearish = currentMacdHist < 0;
      // Entry Signal: CCI crosses back BELOW the +100 level
      const cciSellCross = prevCci >= params.cciLevel && currentCci < params.cciLevel;

      if (cciSellCross && isInDowntrend && isMacdBearish) {
        d.sellSignal = d.high;
      }
    });

    return dataWithIndicators;
  },
};

export default emaCciMacdStrategy;
