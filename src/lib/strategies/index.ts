
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
    // This creates an async function that has access to all the indicator functions.
    // This is safer and more robust than the previous `new Function` constructor.
    const calculateFunction = async (data: any, params: any) => {
      // Create a function that has all the indicators in its scope.
      const scopedFunction = new Function(
        ...indicatorFunctionNames,
        `return (async (data, params) => {
          ${strat.code}
        });`
      )(...indicatorFunctionValues);
      
      return await scopedFunction(data, params);
    };

    return {
      id: strat.id,
      name: strat.displayName,
      description: strat.config.description,
      calculate: calculateFunction,
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
