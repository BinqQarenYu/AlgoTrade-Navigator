
'use client';

import type { Strategy, HistoricalData } from '@/lib/types';
import { getStrategyById } from './all-strategies';

export interface CodeBasedConsensusParams {
  strategies: string[]; // Array of strategy IDs
}

export const defaultCodeBasedConsensusParams: CodeBasedConsensusParams = {
  strategies: ['ema-crossover', 'rsi-divergence', 'macd-crossover'],
};

const codeBasedConsensusStrategy: Strategy = {
  id: 'code-based-consensus',
  name: 'Code-Based Consensus',
  description: 'Generates signals based on the majority vote of several selected technical strategies, without using AI.',
  
  async calculate(data: HistoricalData[], params: CodeBasedConsensusParams = defaultCodeBasedConsensusParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    if (data.length === 0 || params.strategies.length === 0) {
      return dataWithIndicators;
    }

    const allStrategyCalculations: Promise<HistoricalData[]>[] = [];
    
    // Run all sub-strategies in parallel
    for (const strategyId of params.strategies) {
        const strategy = getStrategyById(strategyId);
        if (strategy) {
            // Each strategy runs on a clean copy of the data
            allStrategyCalculations.push(strategy.calculate(JSON.parse(JSON.stringify(data))));
        }
    }

    const results = await Promise.all(allStrategyCalculations);

    // Tally the votes for each candle
    for (let i = 0; i < data.length; i++) {
        let buyVotes = 0;
        let sellVotes = 0;
        
        for (const resultData of results) {
            if (resultData[i]?.buySignal) {
                buyVotes++;
            }
            if (resultData[i]?.sellSignal) {
                sellVotes++;
            }
        }

        // Generate final signal based on consensus
        if (buyVotes > sellVotes) {
            dataWithIndicators[i].buySignal = data[i].low;
        } else if (sellVotes > buyVotes) {
            dataWithIndicators[i].sellSignal = data[i].high;
        }
    }

    return dataWithIndicators;
  },
};

export default codeBasedConsensusStrategy;
