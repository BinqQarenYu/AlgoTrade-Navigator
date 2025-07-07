
'use client';
import type { Strategy, HistoricalData, StrategyAnalysisInput } from '@/lib/types';
import { getStrategyById } from '@/lib/strategies';
import { predictPrice } from '@/ai/flows/predict-price-flow';
import { getFearAndGreedIndex } from '@/lib/fear-greed-service';

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

export interface AiConsensusParams {
  strategyIds: string[];
  // These parameters are not used by the calculate function itself but are here
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
    if (data.length < 50) return dataWithIndicators; // Need enough data for underlying strategies

    const strategyOutputs: StrategyAnalysisInput[] = [];

    // Defensive check to ensure params and strategyIds are valid. If params are passed
    // but are malformed (e.g. from a UI that can't handle non-numeric params),
    // we fall back to the defaults to prevent a crash.
    const currentParams = params || defaultAiConsensusParams;
    const strategyIds = Array.isArray(currentParams.strategyIds) && currentParams.strategyIds.length > 0 
        ? currentParams.strategyIds 
        : defaultAiConsensusParams.strategyIds;

    for (const strategyId of strategyIds) {
        const strategy = getStrategyById(strategyId);
        if (!strategy) {
            console.warn(`AI Consensus: Strategy with id '${strategyId}' not found. Skipping.`);
            continue;
        }

        const calculatedData = await strategy.calculate(data); // Using default params for underlying strategies
        const lastCandleWithIndicators = calculatedData[calculatedData.length - 1];
        
        let signal: 'BUY' | 'SELL' | 'HOLD' | null = null;
        if (lastCandleWithIndicators.buySignal) signal = 'BUY';
        else if (lastCandleWithIndicators.sellSignal) signal = 'SELL';
        else signal = 'HOLD';

        const indicators: Record<string, any> = {};
        for (const key of KNOWN_INDICATORS) {
            if (key in lastCandleWithIndicators && lastCandleWithIndicators[key as keyof HistoricalData] !== null && lastCandleWithIndicators[key as keyof HistoricalData] !== undefined) {
                indicators[key] = lastCandleWithIndicators[key as keyof HistoricalData];
            }
        }
        
        strategyOutputs.push({ strategyName: strategy.name, signal, indicatorValues: indicators });
    }
    
    if (strategyOutputs.length === 0) {
        console.warn("AI Consensus: No valid strategies were run. Aborting.");
        return dataWithIndicators;
    }

    const fng = await getFearAndGreedIndex();
    const marketContext = fng ? `The current Fear & Greed Index is ${fng.value} (${fng.valueClassification}).` : "Market context is neutral.";
    const lastCandle = data[data.length - 1];

    try {
        const prediction = await predictPrice({
            asset: 'N/A', // Asset name isn't critical for this flow, just the data
            interval: 'N/A', // Interval isn't critical either
            currentPrice: lastCandle.close,
            recentData: JSON.stringify(data.slice(-100)),
            strategyOutputs,
            marketContext
        });

        // Add the prediction as a signal to the last candle
        const lastIndex = dataWithIndicators.length - 1;
        if (prediction.predictedDirection === 'UP') {
            dataWithIndicators[lastIndex].buySignal = lastCandle.low;
        } else if (prediction.predictedDirection === 'DOWN') {
            dataWithIndicators[lastIndex].sellSignal = lastCandle.high;
        }
        
        // Store the AI reasoning for potential display in the UI
        dataWithIndicators[lastIndex].aiReasoning = prediction.reasoning;
        dataWithIndicators[lastIndex].aiConfidence = prediction.confidence;

    } catch(e) {
        console.error("AI Consensus strategy failed to get prediction:", e);
        // Do not add signal if AI fails
    }

    return dataWithIndicators;
  },
};

export default aiConsensusStrategy;
