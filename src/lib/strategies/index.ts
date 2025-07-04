
import type { Strategy } from '@/lib/types';
import smaCrossoverStrategy from './sma-crossover';
import emaCrossoverStrategy from './ema-crossover';
import rsiDivergenceStrategy from './rsi-divergence';
import peakFormationFibStrategy from './peak-formation-fib';
import reversePffStrategy from './reverse-pff';
import volumeDeltaStrategy from './volume-profile-delta';
import macdCrossoverStrategy from './macd-crossover';
import bollingerBandsStrategy from './bollinger-bands';
import supertrendStrategy from './supertrend';
import donchianChannelStrategy from './donchian-channels';
import ichimokuCloudStrategy from './ichimoku-cloud';

export const strategies: Strategy[] = [
  peakFormationFibStrategy,
  reversePffStrategy,
  volumeDeltaStrategy,
  smaCrossoverStrategy,
  emaCrossoverStrategy,
  rsiDivergenceStrategy,
  macdCrossoverStrategy,
  bollingerBandsStrategy,
  supertrendStrategy,
  donchianChannelStrategy,
  ichimokuCloudStrategy,
].sort((a,b) => a.name.localeCompare(b.name));

export const getStrategyById = (id: string): Strategy | undefined => {
  return strategies.find(s => s.id === id);
}
