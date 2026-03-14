
'use client';

import type { Strategy, HistoricalData, DisciplineParams } from '@/lib/types';
import { getStrategyById } from './all-strategies';
import { calculateSMA, calculateEMA } from '@/lib/indicators';

export interface CodeBasedConsensusParams {
  strategies: string[]; // Array of strategy IDs
  reverse: boolean; // If true, it will trade against the consensus
  discipline: DisciplineParams;
}

export const defaultCodeBasedConsensusParams: CodeBasedConsensusParams = {
  strategies: ['ema-crossover', 'rsi-divergence', 'macd-crossover'],
  reverse: false,
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
  description: 'Pro Fade Engine: Generates signals based on the majority vote of selected technical strategies. When reversed (Contrarian Mode), it executes a true Fade Trade by detecting exhaustion, over-extension, and unanimous fakeouts.',
  
  async calculate(data: HistoricalData[], params: CodeBasedConsensusParams = defaultCodeBasedConsensusParams): Promise<HistoricalData[]> {
    const dataWithIndicators = data.map(d => ({ ...d }));
    if (data.length === 0 || params.strategies.length === 0) {
      return dataWithIndicators;
    }

    const allStrategyCalculations: Promise<HistoricalData[]>[] = [];
    
    // Run all sub-strategies in parallel
    for (const strategyId of params.strategies) {
        const strategy = getStrategyById(strategyId);
        if (strategy) {
            // Each strategy runs on a clean copy of the data
            allStrategyCalculations.push(strategy.calculate(data.map(d => ({ ...d }))));
        }
    }

    const results = await Promise.all(allStrategyCalculations);

    const volumeData = data.map(d => d.volume);
    const closeData = data.map(d => d.close);
    const volumeSma = calculateSMA(volumeData, 20); // 20-period volume average for exhaustion
    const baselineEma = calculateEMA(closeData, 50); // 50-period EMA for mean reversion extension
    const strategyCount = params.strategies.length;

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

        const hasConsensus = buyVotes !== sellVotes;
        if (!hasConsensus) continue;

        const isBuyConsensus = buyVotes > sellVotes;

        // Generate final signal based on consensus and the reverse parameter
        if (params.reverse) {
            // PRO CONTRARIAN MODE (FADE TRADING)
            // A basic inversion is unreliable. We only trade against the herd if they are trapped.
            
            // Phase 1: Unanimous Fakeout Detector
            // Only fade if the consensus is extremely strong (>80% of active strategies agree).
            // A weak consensus means the market is choppy, not over-extended.
            const dominantVotes = Math.max(buyVotes, sellVotes);
            const consensusStrength = strategyCount > 0 ? (dominantVotes / strategyCount) : 0;
            if (consensusStrength < 0.8) continue; 

            // Phase 2: Exhaustion Filter (Capitulation/Euphoria Check)
            // Trade only if current volume is significantly higher than the 20-period average.
            const currentVol = data[i].volume;
            const avgVol = volumeSma[i];
            if (avgVol === null || currentVol < avgVol * 1.5) continue;

            // Phase 3: Mean Reversion / Extension Check
            // Trade only if the price has stretched too far from the 50 EMA.
            const currentClose = data[i].close;
            const emaBase = baselineEma[i];
            if (emaBase === null) continue;
            const distancePercent = Math.abs((currentClose - emaBase) / emaBase) * 100;
            if (distancePercent < 1.0) continue; // Requires at least a 1% stretch from the mean to justify a snap-back trade

            // If all 3 traps trigger, the herd is wrong, and the contrarian strikes:
            if (isBuyConsensus) {
                dataWithIndicators[i].sellSignal = data[i].high;
            } else {
                dataWithIndicators[i].buySignal = data[i].low;
            }
        } else {
            // Follower mode (default majority rules)
            if (isBuyConsensus) {
                dataWithIndicators[i].buySignal = data[i].low;
            } else {
                dataWithIndicators[i].sellSignal = data[i].high;
            }
        }
    }

    return dataWithIndicators;
  },
};

export default codeBasedConsensusStrategy;
