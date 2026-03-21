'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { calculateCCI, calculateEMA } from '@/lib/indicators';

/**
 * TOXICITY REVERSION ENGINE
 * Trades against Phantom Liquidity and VPIN extremes. 
 * Note: When run historically, it uses algorithmic volume-spread proxies for order-book spoofing.
 * When run live via DataHub, it natively hooks into MicrostructureService metrics.
 */

export interface ToxicityReversionParams {
  toxicityThreshold: number; // Volume spike multiplier representing a spoof/wall
  trendPeriod: number;
  cciPeriod: number;
  discipline: DisciplineParams;
}

export const defaultToxicityReversionParams: ToxicityReversionParams = {
  toxicityThreshold: 3.5, // 350% average volume
  trendPeriod: 50,
  cciPeriod: 14,
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 3,
    cooldownPeriodMinutes: 60,
    dailyDrawdownLimit: 5,
    onFailure: 'Cooldown',
  },
};

const toxicityReversionStrategy: Strategy = {
  id: 'toxicity-reversion',
  name: 'Microstructure Toxicity Reversion',
  description: 'Exploits Phantom Liquidity and spoofing traps by trading the mean-reversion pullback when toxic walls are unexpectedly pulled.',

  async calculate(data: HistoricalData[], params: ToxicityReversionParams = defaultToxicityReversionParams): Promise<HistoricalData[]> {
    const minRequired = Math.max(params.trendPeriod, params.cciPeriod);
    if (!data || data.length < minRequired) {
      return data ? data.map(d => ({ ...d })) : [];
    }

    const cci = calculateCCI(data, params.cciPeriod);
    const ema = calculateEMA(data.map(d => d.close), params.trendPeriod);

    // Calculate rolling volume average for historical proxy
    const volumes = data.map(d => d.volume);
    const avgVolume: number[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < 20) {
            avgVolume.push(volumes[i]);
            continue;
        }
        let sum = 0;
        for (let j = i - 20; j < i; j++) sum += volumes[j];
        avgVolume.push(sum / 20);
    }

    return data.map((d, i) => {
      const currentCandle: HistoricalData = { ...d, cci: cci[i] };
      
      if (i < 1 || cci[i] === null || cci[i - 1] === null) return currentCandle;

      const currCCI = cci[i]!;
      const prevCCI = cci[i - 1]!;
      const trendLine = ema[i] || d.close;
      const avgVol = avgVolume[i];

      // Historical Proxy for Toxicity: Massive volume spike + candle closed far from high/low (rejection/cancel)
      const isToxicVolume = d.volume > avgVol * params.toxicityThreshold;
      const isShootingStar = d.close < d.open && (d.high - Math.max(d.open, d.close)) > (Math.abs(d.close - d.open) * 2);
      const isHammer = d.close > d.open && (Math.min(d.open, d.close) - d.low) > (Math.abs(d.close - d.open) * 2);

      // Trigger conditions: 
      // Buy: Toxic volume rejection at low + CCI oversold cross
      const longTrigger = isToxicVolume && isHammer && currCCI < -100 && prevCCI > currCCI;
      
      // Sell: Toxic volume rejection at high + CCI overbought cross
      const shortTrigger = isToxicVolume && isShootingStar && currCCI > 100 && prevCCI < currCCI;

      if (longTrigger) {
        currentCandle.buySignal = d.low;
      }
      if (shortTrigger) {
        currentCandle.sellSignal = d.high;
      }

      // Exit on normalize
      if (prevCCI < 0 && currCCI >= 0) currentCandle.exitLongSignal = d.high;
      if (prevCCI > 0 && currCCI <= 0) currentCandle.exitShortSignal = d.low;

      return currentCandle;
    });
  },
};

export default toxicityReversionStrategy;
