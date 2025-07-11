
'use client';
import type { Strategy, HistoricalData, StrategyAnalysisInput } from '@/lib/types';
import { predictPrice } from '@/ai/flows/predict-price-flow';
import { getFearAndGreedIndex } from '@/lib/fear-greed-service';

// --- Direct Imports to break circular dependency ---
import emaCrossoverStrategy from './ema-crossover';
import rsiDivergenceStrategy from './rsi-divergence';
import macdCrossoverStrategy from './macd-crossover';
import bollingerBandsStrategy from './bollinger-bands';
// ---

// Known indicators to extract from strategy calculations
const KNOWN_INDICATORS = [
    'sma_short', 'sma_long', 'ema_short', 'ema_long', 'rsi', 'stopLossLevel',
    'peakPrice', 'poc', 'volumeDelta', 'cumulativeVolumeDelta', 'bb_upper', 'bb_middle',
    'bb_lower', 'macd', 'macd_signal', 'macd_hist', 'supertrend', 'supertrend_direction',
    'atr', 'donchian_upper', 'donchian_middle', 'donchian_lower', 'tenkan_sen',
    'kijun_sen', 'senkou_a', 'senkou_b', 'chikou_span', 'stoch_k', 'stoch_d', 'keltner_upper', 
    'keltner_middle', 'keltner_lower', 'vwap', 'psar', 'psar_direction', 'momentum', 'awesome_oscillator', 
    'williams_r', 'cci', 'ha_close', 'pivot_point', 's1', 'r1', 'obv', 'cmf', 'coppock', 'bull_power', 'bear_power'
];

const SUB_STRATEGIES: Record<string, Strategy> = {
  [emaCrossoverStrategy.id]: emaCrossoverStrategy,
  [rsiDivergenceStrategy.id]: rsiDivergenceStrategy,
  [macdCrossoverStrategy.id]: macdCrossoverStrategy,
  [bollingerBandsStrategy.id]: bollingerBandsStrategy,
};

export interface AiConsensusParams {
  strategyIds: string[];
  // This parameter is not used by the calculate function itself but is here
  // to show this strategy is composed of others. In a more advanced system,
  // these could be used to pass-through parameters to the underlying strategies.
  dummyParam: number; 
}

export const defaultAiConsensusParams: AiConsensusParams = {
  strategyIds: ['ema-crossover', 'rsi-divergence', 'macd-crossover', 'bollinger-bands'],
  dummyParam: 1,
};

const aiConsensusStrategy: Strategy = {
  id: 'ai-consensus',
  name: 'AI Consensus',
  description: 'Uses an ensemble of strategies and a meta-model AI to predict price direction. Generates a signal based on the AI\'s final output.',
  async calculate(data: HistoricalData[], params: AiConsensusParams = defaultAiConsensusParams): Promise<HistoricalData[]> {
    const dataWithIndicators = JSON.parse(JSON.stringify(data));
    const minHistory = 100;
    if (data.length < minHistory) return dataWithIndicators;

    const currentParams = params || defaultAiConsensusParams;
    const strategyIds = Array.isArray(currentParams.strategyIds) && currentParams.strategyIds.length > 0 
        ? currentParams.strategyIds 
        : defaultAiConsensusParams.strategyIds;
    
    // 1. Pre-calculate all indicators for all sub-strategies across the entire dataset
    const allStrategyCalculations: Record<string, HistoricalData[]> = {};
    for (const strategyId of strategyIds) {
        const strategy = SUB_STRATEGIES[strategyId];
        if (!strategy) continue;
        allStrategyCalculations[strategyId] = await strategy.calculate(data);
    }
    
    // 2. Fetch market context once
    const fng = await getFearAndGreedIndex();
    const marketContext = fng ? `The current Fear & Greed Index is ${fng.value} (${fng.valueClassification}).` : "Market context is neutral.";

    // 3. Loop through each candle to make a prediction
    let lastSignalType: 'buy' | 'sell' | null = null;
    for (let i = minHistory; i < data.length; i++) {
        // AI Throttling: Only call the AI every 5 candles to reduce cost during backtests.
        if (i % 5 !== 0) continue; 

        const strategyOutputs: StrategyAnalysisInput[] = [];
        const currentPrice = data[i].close;
        const recentData = JSON.stringify(data.slice(i - 100, i + 1));

        for (const strategyId of strategyIds) {
            const strategy = SUB_STRATEGIES[strategyId];
            if (!strategy || !allStrategyCalculations[strategyId]) continue;

            const candleWithIndicators = allStrategyCalculations[strategyId][i];
            
            let signal: 'BUY' | 'SELL' | 'HOLD' | null = null;
            if (candleWithIndicators.buySignal) signal = 'BUY';
            else if (candleWithIndicators.sellSignal) signal = 'SELL';
            else signal = 'HOLD';

            const indicators: Record<string, any> = {};
            for (const key of KNOWN_INDICATORS) {
                if (key in candleWithIndicators && candleWithIndicators[key as keyof HistoricalData] !== null && candleWithIndicators[key as keyof HistoricalData] !== undefined) {
                    indicators[key] = candleWithIndicators[key as keyof HistoricalData];
                }
            }
            strategyOutputs.push({ strategyName: strategy.name, signal, indicatorValues: indicators });
        }

        if (strategyOutputs.length === 0) continue;

        try {
            const prediction = await predictPrice({
                asset: 'N/A',
                interval: 'N/A',
                currentPrice,
                recentData,
                strategyOutputs,
                marketContext
            });

            // Only generate a signal if confidence is above a certain threshold
            if (prediction.confidence > 0.6) {
                if (prediction.predictedDirection === 'UP' && lastSignalType !== 'buy') {
                    dataWithIndicators[i].buySignal = data[i].low;
                    lastSignalType = 'buy';
                } else if (prediction.predictedDirection === 'DOWN' && lastSignalType !== 'sell') {
                    dataWithIndicators[i].sellSignal = data[i].high;
                    lastSignalType = 'sell';
                }
            }
            
            dataWithIndicators[i].aiReasoning = prediction.reasoning;
            dataWithIndicators[i].aiConfidence = prediction.confidence;

        } catch (e) {
            console.error(`AI consensus failed at index ${i}:`, e);
        }
    }

    return dataWithIndicators;
  },
};

export default aiConsensusStrategy;
