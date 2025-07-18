
import type { Strategy } from '@/lib/types';
import { strategies as allStrategies } from './all-strategies';
import { strategyIndicatorMap } from './indicator-map';
import * as indicatorFunctions from '@/lib/indicators';

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

  const indicatorFunctionNames = Object.keys(indicatorFunctions);
  const indicatorFunctionValues = Object.values(indicatorFunctions);

  const customStrategyInstances: Strategy[] = customStrategies.map(strat => {
    // Create a new async function.
    // The first set of arguments are the names of the functions we're injecting.
    // The last argument is the actual code body.
    const dynamicFunction = new Function(
        ...indicatorFunctionNames, 
        'data', 
        'params', 
        `return (async () => { ${strat.code} })()`
    );

    return {
      id: strat.id,
      name: strat.displayName,
      description: strat.config.description,
      // Bind the indicator functions to the dynamic function's arguments.
      calculate: (data, params) => dynamicFunction(...indicatorFunctionValues, data, params),
    };
  });
  
  const combined = [...allStrategies, ...customStrategyInstances];
  // Sort once after combining
  return combined.sort((a,b) => a.name.localeCompare(b.name));
};

export const strategies: Strategy[] = loadAllStrategies();

export const getStrategyById = (id: string): Strategy | undefined => {
  // We need to reload all strategies to find the one by ID, in case it's custom.
  const allCurrentStrategies = loadAllStrategies();
  return allCurrentStrategies.find(s => s.id === id);
};

export const strategyMetadatas = strategies.map(({ id, name }) => ({
  id,
  name,
}));

export { strategyIndicatorMap };
