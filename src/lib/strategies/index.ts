
import type { Strategy } from '@/lib/types';
import { strategies as allStrategies, getStrategyById } from './all-strategies';
import { strategyIndicatorMap } from './indicator-map';

// We no longer import temp-generated here to avoid build errors.
// The backtest page will handle loading it dynamically.

export const strategies: Strategy[] = [...allStrategies];

export const strategyMetadatas = strategies.map(({ id, name }) => ({
  id,
  name,
}));

// The main getStrategyById function now only knows about static strategies.
// The backtest page will have special logic for the temporary one.
export { getStrategyById, strategyIndicatorMap };
