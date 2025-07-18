
import type { Strategy } from '@/lib/types';
import { strategies as allStrategies, getStrategyById } from './all-strategies';
import { strategyIndicatorMap } from './indicator-map';

// This function will be replaced by a dynamic loader in a real app
// to include user-generated strategies. For now, it's static.
const loadGeneratedStrategies = (): Strategy[] => {
    // In a real implementation, this would read from a directory
    // or a database where custom strategies are stored.
    // e.g., const customStrategies = loadStrategiesFromFS();
    // return customStrategies;
    return [];
}

const generatedStrategies = loadGeneratedStrategies();

export const strategies: Strategy[] = [...allStrategies, ...generatedStrategies];

export const strategyMetadatas = strategies.map(({ id, name }) => ({
  id,
  name,
}));

// The getStrategyById function also needs to be able to find generated strategies
export const getStrategyByIdWithGenerated = (id: string): Strategy | undefined => {
  return strategies.find(s => s.id === id);
};

export { getStrategyById, strategyIndicatorMap };
