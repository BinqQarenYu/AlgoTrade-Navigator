
import type { Strategy } from '@/lib/types';
import { strategies as allStrategies } from './all-strategies';
import { strategyIndicatorMap } from './indicator-map';

// This function will now be responsible for merging static strategies with custom ones from localStorage
const loadAllStrategies = (): Strategy[] => {
  let customStrategies: any[] = [];
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('custom-strategies');
    if (stored) {
      try {
        customStrategies = JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse custom strategies from localStorage", e);
      }
    }
  }

  const customStrategyInstances: Strategy[] = customStrategies.map(strat => ({
    id: strat.id,
    name: strat.displayName,
    description: strat.config.description,
    calculate: new Function('data', 'params', `return (async () => { ${strat.code} })()`) as any,
  }));
  
  const combined = [...allStrategies, ...customStrategyInstances];
  // Sort once after combining
  return combined.sort((a,b) => a.name.localeCompare(b.name));
};

export const strategies: Strategy[] = loadAllStrategies();

export const getStrategyById = (id: string): Strategy | undefined => {
  return strategies.find(s => s.id === id);
};

export const strategyMetadatas = strategies.map(({ id, name }) => ({
  id,
  name,
}));

export { strategyIndicatorMap };
