import type { Strategy } from '@/lib/types';
import smaCrossoverStrategy from './sma-crossover';
import emaCrossoverStrategy from './ema-crossover';
import rsiDivergenceStrategy from './rsi-divergence';
import peakFormationFibStrategy from './peak-formation-fib';
import volumeDeltaStrategy from './volume-profile-delta';

export const strategies: Strategy[] = [
  smaCrossoverStrategy,
  emaCrossoverStrategy,
  rsiDivergenceStrategy,
  peakFormationFibStrategy,
  volumeDeltaStrategy
];

export const getStrategyById = (id: string): Strategy | undefined => {
  return strategies.find(s => s.id === id);
}
