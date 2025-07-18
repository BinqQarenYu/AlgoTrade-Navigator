
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
    // Create an async function wrapper that will execute the AI-generated code.
    const calculateFunction = async (data: any, params: any) => {
      // Create a new async function dynamically. This is a more robust way to handle dynamic code execution.
      // The AI generates ONLY the body of this function.
      const dynamicFunction = new (Object.getPrototypeOf(async function () {}).constructor)(
        ...indicatorFunctionNames,
        `
          // The 'data' and 'params' arguments are implicitly available through the outer scope.
          ${strat.code}
        `
      );
      
      // Execute the function, passing in all indicator functions as arguments.
      // They become available as variables inside the AI-generated code.
      return await dynamicFunction(...indicatorFunctionValues)(data, params);
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
