
import type { Strategy } from '@/lib/types';
import { strategies as allStrategies, getStrategyById } from './all-strategies';
import { strategyIndicatorMap } from './indicator-map';

export const strategies: Strategy[] = allStrategies;

export const strategyMetadatas = strategies.map(({ id, name }) => ({
  id,
  name,
}));

export { getStrategyById, strategyIndicatorMap };
