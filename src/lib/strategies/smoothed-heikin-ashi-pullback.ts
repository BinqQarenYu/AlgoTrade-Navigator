
'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateHeikinAshi } from '@/lib/indicators';

export interface SmoothedHeikinAshiPullbackParams {
    reverse?: boolean;
    discipline: DisciplineParams;
}

export const defaultSmoothedHeikinAshiPullbackParams: SmoothedHeikinAshiPullbackParams = {
    reverse: false,
    discipline: {
        enableDiscipline: true,
        maxConsecutiveLosses: 4,
        cooldownPeriodMinutes: 15,
        dailyDrawdownLimit: 10,
        onFailure: 'Cooldown',
    },
};

// --- Candlestick Pattern Helpers ---
const isBullishEngulfing = (current: HistoricalData, previous: HistoricalData): boolean => {
  const isPreviousBearish = previous.close < previous.open;
  const isCurrentBullish = current.close > current.open;
  const engulfs = current.open < previous.close && current.close > previous.open;
  return isPreviousBearish && isCurrentBullish && engulfs;
};

const isHammer = (candle: HistoricalData): boolean => {
  const bodySize = Math.abs(candle.open - candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const totalRange = candle.high - candle.low;
  if (totalRange === 0) return false;
  // Long lower wick, small upper wick, small body
  return lowerWick > bodySize * 2 && upperWick < bodySize;
};

const isBearishEngulfing = (current: HistoricalData, previous: HistoricalData): boolean => {
  const isPreviousBullish = previous.close > previous.open;
  const isCurrentBearish = current.close < current.open;
  const engulfs = current.open > previous.close && current.close < previous.open;
  return isPreviousBullish && isCurrentBearish && engulfs;
};

const isShootingStar = (candle: HistoricalData): boolean => {
    const bodySize = Math.abs(candle.open - candle.close);
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;
    const totalRange = candle.high - candle.low;
    if (totalRange === 0) return false;
    // Long upper wick, small lower wick, small body
    return upperWick > bodySize * 2 && lowerWick < bodySize;
};

const smoothedHeikinAshiPullbackStrategy: Strategy = {
  id: 'smoothed-heikin-ashi-pullback',
  name: 'Smoothed Heikin Ashi Pullback',
  description: 'Enters a trend on a pullback to a Smoothed Heiken Ashi line, confirmed by classic candlestick patterns.',
  async calculate(data: HistoricalData[], params: SmoothedHeikinAshiPullbackParams = defaultSmoothedHeikinAshiPullbackParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    if (data.length < 2) return dataWithIndicators;

    const haData = calculateHeikinAshi(data);

    let trendState: 'uptrend' | 'downtrend' | 'none' = 'none';

    for (let i = 1; i < data.length; i++) {
      const currentCandle = data[i];
      const prevCandle = data[i - 1];
      const currentHa = haData[i];
      const prevHa = haData[i - 1];

      dataWithIndicators[i].ha_open = currentHa.ha_open;
      dataWithIndicators[i].ha_close = currentHa.ha_close;
      dataWithIndicators[i].ha_high = currentHa.ha_high;
      dataWithIndicators[i].ha_low = currentHa.ha_low;

      if (!prevHa.ha_open || !prevHa.ha_close || !currentHa.ha_open || !currentHa.ha_close) {
        continue;
      }

      const prevIsGreen = prevHa.ha_close > prevHa.ha_open;
      const currentIsGreen = currentHa.ha_close > currentHa.ha_open;

      // Detect trend change
      if (!prevIsGreen && currentIsGreen) {
        trendState = 'uptrend';
      } else if (prevIsGreen && !currentIsGreen) {
        trendState = 'downtrend';
      }

      // Handle Sideways/Choppy Market Invalidation (Doji-like HA candles)
      const isSideways = Math.abs(currentHa.ha_open - currentHa.ha_close) < (currentHa.ha_high! - currentHa.ha_low!) * 0.1;
      if (isSideways) {
        trendState = 'none'; // Invalidate trend on choppy signals
      }

      // Check for BUY setup
      if (trendState === 'uptrend') {
        const supportLine = currentHa.ha_open;
        if (currentCandle.low <= supportLine) {
          if (isBullishEngulfing(currentCandle, prevCandle) || isHammer(currentCandle)) {
            dataWithIndicators[i].buySignal = currentCandle.low;
            dataWithIndicators[i].stopLossLevel = currentCandle.low * 0.99; // Simple SL for now
            trendState = 'none'; // Reset after signal to avoid multiple entries
          }
        }
      }

      // Check for SELL setup
      if (trendState === 'downtrend') {
        const resistanceLine = currentHa.ha_open;
        if (currentCandle.high >= resistanceLine) {
          if (isBearishEngulfing(currentCandle, prevCandle) || isShootingStar(currentCandle)) {
            dataWithIndicators[i].sellSignal = currentCandle.high;
            dataWithIndicators[i].stopLossLevel = currentCandle.high * 1.01; // Simple SL for now
            trendState = 'none'; // Reset after signal
          }
        }
      }
    }

    return dataWithIndicators;
  },
};

export default smoothedHeikinAshiPullbackStrategy;
