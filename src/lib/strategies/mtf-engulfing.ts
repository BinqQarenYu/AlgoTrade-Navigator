
'use client';
import type { Strategy, HistoricalData } from '@/lib/types';
import { calculateEMA, calculateATR } from '@/lib/indicators';
import { getHistoricalKlines } from '@/lib/binance-service';

export interface MtfEngulfingParams {
  htf: '1D' | '4h' | '1h'; // Limit to a few for simplicity
  emaLength: number;
  atrLength: number;
  slAtrMultiplier: number;
  rrRatio: number;
}

export const defaultMtfEngulfingParams: MtfEngulfingParams = {
  htf: '1D',
  emaLength: 21,
  atrLength: 14,
  slAtrMultiplier: 1.5,
  rrRatio: 2.0,
};

// Helper to map HTF data to LTF data
const mapHtfToLtf = (ltfData: HistoricalData[], htfData: HistoricalData[]): (number | null)[] => {
    const htfMap = new Map<number, number>();
    htfData.forEach(d => {
        // Use the start of the day for daily candles to map correctly
        const dayStart = new Date(d.time);
        dayStart.setUTCHours(0, 0, 0, 0);
        htfMap.set(dayStart.getTime(), d.ema_long!);
    });

    let lastHtfEma: number | null = null;
    return ltfData.map(d => {
        const ltfDayStart = new Date(d.time);
        ltfDayStart.setUTCHours(0, 0, 0, 0);
        
        if (htfMap.has(ltfDayStart.getTime())) {
            lastHtfEma = htfMap.get(ltfDayStart.getTime())!;
        }
        return lastHtfEma;
    });
};

const mtfEngulfingStrategy: Strategy = {
  id: 'mtf-engulfing',
  name: 'MTF Engulfing',
  description: 'Uses a Higher Timeframe EMA for trend and enters on a Lower Timeframe Engulfing candle.',
  
  async calculate(data: HistoricalData[], params: MtfEngulfingParams = defaultMtfEngulfingParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    if (data.length < params.emaLength) return dataWithIndicators;

    // Fetch HTF data - This is a simplification of request.security
    // In a real scenario, you'd need a more robust data fetching mechanism.
    const htfIntervalMap = { '1D': '1d', '4h': '4h', '1h': '1h' };
    const htfBinanceInterval = htfIntervalMap[params.htf];

    const htfStartTime = data[0].time;
    const htfEndTime = data[data.length - 1].time;
    const htfDataRaw = await getHistoricalKlines('BTCUSDT', htfBinanceInterval, htfStartTime, htfEndTime);
    
    if (htfDataRaw.length === 0) {
      console.warn("Could not fetch HTF data for MTF Engulfing strategy.");
      return dataWithIndicators; // Return original data if HTF fetch fails
    }

    const htfEmaValues = calculateEMA(htfDataRaw.map(d => d.close), params.emaLength);
    const htfDataWithEma = htfDataRaw.map((d, i) => ({ ...d, ema_long: htfEmaValues[i] }));
    
    const htfEmaMapped = mapHtfToLtf(data, htfDataWithEma);
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

      if (isUptrend && isBullishEngulfing) {
        const atr = atrValues[i]!;
        const stopLoss = d.close - (atr * params.slAtrMultiplier);
        const risk = d.close - stopLoss;
        const takeProfit = d.close + (risk * params.rrRatio);
        
        d.buySignal = d.close;
        d.stopLossLevel = stopLoss;
        // The chart component will calculate TP, but we can note it here if needed.
      }
      
      if (isDowntrend && isBearishEngulfing) {
        const atr = atrValues[i]!;
        const stopLoss = d.close + (atr * params.slAtrMultiplier);
        const risk = stopLoss - d.close;
        const takeProfit = d.close - (risk * params.rrRatio);

        d.sellSignal = d.close;
        d.stopLossLevel = stopLoss;
      }
    });

    return dataWithIndicators;
  },
};

export default mtfEngulfingStrategy;
