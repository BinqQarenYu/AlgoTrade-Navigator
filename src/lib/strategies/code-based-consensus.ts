'use client';

import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { getStrategyById } from './all-strategies';

export interface CodeBasedConsensusParams {
  strategies: string[]; // Array of strategy IDs
  discipline: DisciplineParams;
}

export const defaultCodeBasedConsensusParams: CodeBasedConsensusParams = {
  strategies: ['ema-crossover', 'rsi-divergence', 'macd-crossover'],
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
  },
};

const codeBasedConsensusStrategy: Strategy = {
  id: 'code-based-consensus',
  name: 'Code-Based Consensus',
  description: 'Generates signals based on the majority vote of several selected technical strategies. Can be reversed to trade against the consensus.',
  
  async calculate(data: HistoricalData[], userParams: Partial<CodeBasedConsensusParams> = {}): Promise<HistoricalData[]> {
    const params = { ...defaultCodeBasedConsensusParams, ...userParams };
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    if (data.length === 0 || params.strategies.length === 0) {
      return dataWithIndicators;
    }

    const allStrategyCalculations: Promise<HistoricalData[]>[] = [];
    
    for (const strategyId of params.strategies) {
        const strategy = getStrategyById(strategyId);
        if (strategy) {
            allStrategyCalculations.push(strategy.calculate(JSON.parse(JSON.stringify(data))));
        }
    }

    const results = await Promise.all(allStrategyCalculations);

    for (let i = 0; i < data.length; i++) {
        let buyVotes = 0;
        let sellVotes = 0;
        
        for (const resultData of results) {
            if (resultData[i]?.bullish_event) {
                buyVotes++;
            }
            if (resultData[i]?.bearish_event) {
                sellVotes++;
            }
        }

        const hasConsensus = buyVotes !== sellVotes;
        if (!hasConsensus) continue;

        if (buyVotes > sellVotes) {
            dataWithIndicators[i].bullish_event = true;
        } else {
            dataWithIndicators[i].bearish_event = true;
        }
    }

    return dataWithIndicators;
  },
};

export default codeBasedConsensusStrategy;
