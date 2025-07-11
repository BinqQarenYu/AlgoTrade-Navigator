'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateEMA, calculateATR } from '@/lib/indicators';
import { getHistoricalKlines } from '@/lib/binance-service';
import { intervalToMs } from '@/lib/utils';

export interface MtfEngulfingParams {
  htf: '1D' | '4h' | '1h'; // Limit to a few for simplicity
  emaLength: number;
  atrLength: number;
  slAtrMultiplier: number;
  rrRatio: number;
  reverse?: boolean;
}

export const defaultMtfEngulfingParams: MtfEngulfingParams = {
  htf: '1D',
  emaLength: 21,
  atrLength: 14,
  slAtrMultiplier: 1.5,
  rrRatio: 2.0,
  reverse: false,
};

// Helper to map HTF data to LTF data
const mapHtfToLtf = (ltfData: HistoricalData[], htfData: HistoricalData[], htfInterval: '1d' | '4h' | '1h'): (number | null)[] => {
    const htfIntervalMs = intervalToMs(htfInterval);
    if (htfIntervalMs === 0) return Array(ltfData.length).fill(null);

    const htfMap = new Map<number, number>();
    htfData.forEach(d => {
        if (d.ema_long !== null && d.ema_long !== undefined) {
            // Normalize the HTF timestamp to the beginning of its interval
            const htfStartTime = Math.floor(d.time / htfIntervalMs) * htfIntervalMs;
            htfMap.set(htfStartTime, d.ema_long);
        }
    });

    let lastHtfEma: number | null = null;
    return ltfData.map(d => {
        // Normalize the LTF timestamp to find which HTF block it belongs to
        const ltfIntervalStart = Math.floor(d.time / htfIntervalMs) * htfIntervalMs;
        
        if (htfMap.has(ltfIntervalStart)) {
            lastHtfEma = htfMap.get(ltfIntervalStart)!;
        }
        return lastHtfEma;
    });
};

const mtfEngulfingStrategy: Strategy = {
  id: 'mtf-engulfing',
  name: 'MTF Engulfing',
  description: 'Uses a Higher Timeframe EMA for trend and enters on a Lower Timeframe Engulfing candle.',
  
  async calculate(data: HistoricalData[], params: MtfEngulfingParams = defaultMtfEngulfingParams, symbol: string = 'BTCUSDT'): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    if (data.length < params.emaLength) return dataWithIndicators;

    // Fetch HTF data
    const htfIntervalMap = { '1D': '1d', '4h': '4h', '1h': '1h' } as const;
    const htfBinanceInterval = htfIntervalMap[params.htf];

    const htfStartTime = data[0].time;
    const htfEndTime = data[data.length - 1].time;
    // A real implementation might need to fetch slightly more data to ensure the EMA is accurate at the start.
    const htfDataRaw = await getHistoricalKlines(symbol, htfBinanceInterval, htfStartTime, htfEndTime);
    
    if (htfDataRaw.length === 0) {
      console.warn("Could not fetch HTF data for MTF Engulfing strategy.");
      return dataWithIndicators; // Return original data if HTF fetch fails
    }

    const htfEmaValues = calculateEMA(htfDataRaw.map(d => d.close), params.emaLength);
    const htfDataWithEma = htfDataRaw.map((d, i) => ({ ...d, ema_long: htfEmaValues[i] }));
    
    const htfEmaMapped = mapHtfToLtf(data, htfDataWithEma, htfBinanceInterval);
    const atrValues = calculateATR(data, params.atrLength);

    dataWithIndicators.forEach((d: HistoricalData, i: number) => {
      d.ema_long = htfEmaMapped[i]; // Use ema_long for plotting
      d.atr = atrValues[i];

      if (i < 1 || !htfEmaMapped[i] || !atrValues[i]) return;

      const prev = data[i - 1];
      const isUptrend = d.close > htfEmaMapped[i]!;
      const isDowntrend = d.close < htfEmaMapped[i]!;
      
      // Bullish Engulfing: Current green, previous red, current engulfs previous body
      const isBullishEngulfing = (d.close > d.open) && (prev.close < prev.open) && (d.close > prev.open) && (d.open < prev.close);
      // Bearish Engulfing: Current red, previous green, current engulfs previous body
      const isBearishEngulfing = (d.close < d.open) && (prev.close > prev.open) && (d.close < prev.open) && (d.open > prev.close);

      const standardBuy = isUptrend && isBullishEngulfing;
      const standardSell = isDowntrend && isBearishEngulfing;

      const atr = atrValues[i]!;

      if (params.reverse) {
        if (standardBuy) {
            d.sellSignal = d.close;
            d.stopLossLevel = d.close + (atr * params.slAtrMultiplier);
        }
        if (standardSell) {
            d.buySignal = d.close;
            d.stopLossLevel = d.close - (atr * params.slAtrMultiplier);
        }
      } else {
        if (standardBuy) {
            d.buySignal = d.close;
            d.stopLossLevel = d.close - (atr * params.slAtrMultiplier);
        }
        if (standardSell) {
            d.sellSignal = d.close;
            d.stopLossLevel = d.close + (atr * params.slAtrMultiplier);
        }
      }
    });

    return dataWithIndicators;
  },
};

export default mtfEngulfingStrategy;
