
import { HistoricalData } from '@/lib/types';
import { calculateSMA, calculateEMA } from '@/lib/indicators';

/**
 * Filter strategy signals using Fade Engine logic (Exhaustion & Over-extension)
 */
export function applyFadeEngineFilters(data: HistoricalData[], reverse: boolean): HistoricalData[] {
  if (!reverse) return data;

  const result = data.map(d => ({ ...d }));
  const volumeData = data.map(d => d.volume);
  const closeData = data.map(d => d.close);
  
  const volumeSma = calculateSMA(volumeData, 20);
  const baselineEma = calculateEMA(closeData, 50);

  for (let i = 0; i < result.length; i++) {
    // If there's no signal, nothing to filter
    if (!result[i].buySignal && !result[i].sellSignal) continue;

    // Filter 1: Exhaustion (Volume check)
    const currentVol = result[i].volume;
    const avgVol = volumeSma[i];
    const isExhausted = avgVol !== null && currentVol >= avgVol * 1.5;

    // Filter 2: Over-extension (EMA distance)
    const currentClose = result[i].close;
    const emaBase = baselineEma[i];
    const isExtended = emaBase !== null && (Math.abs((currentClose - emaBase) / emaBase) * 100) >= 1.0;

    // Consistency check: For a BUY signal (which is a reversal of a downtrend in contrarian mode), 
    // we expect price to be BELOW the EMA. For a SELL signal, ABOVE the EMA.
    const isCorrectSide = result[i].buySignal 
        ? (emaBase !== null && currentClose < emaBase) 
        : (emaBase !== null && currentClose > emaBase);

    if (!isExhausted || !isExtended || !isCorrectSide) {
      // If it doesn't meet the "Advanced" criteria, kill the signal
      delete result[i].buySignal;
      delete result[i].sellSignal;
    }
  }

  return result;
}
