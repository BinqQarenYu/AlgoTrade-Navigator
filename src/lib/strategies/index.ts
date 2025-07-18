
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
    // A robust, async function wrapper that injects dependencies.
    const calculateFunction = async (data: any, params: any) => {
        
      // Correctly create a new async function with all indicators in its scope.
      // The AI generates only the BODY of the function.
      const scopedFunction = new (Object.getPrototypeOf(async function(){}).constructor)(
        ...indicatorFunctionNames, 
        'data', 
        'params', 
        strat.code
      );
      
      return await scopedFunction(...indicatorFunctionValues, data, params);
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
