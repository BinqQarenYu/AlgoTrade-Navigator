
'use client';
import type { Strategy, HistoricalData, DisciplineParams } from '../types';
import { calculateEMA, calculateSMA, calculateCCI, calculateRSI } from '../indicators';
import { predictMarket } from '@/ai/flows/predict-market-flow';

export interface AIHybridParams {
    fastEmaPeriod: number;
    slowEmaPeriod: number;
    rsiPeriod: number;
    cciPeriod: number;
    minAiConfidence: number;
    useAiValidation: boolean;
    reverse?: boolean;
    discipline: DisciplineParams;
}

export const defaultAIHybridParams: AIHybridParams = {
    fastEmaPeriod: 13,
    slowEmaPeriod: 48,
    rsiPeriod: 14,
    cciPeriod: 20,
    minAiConfidence: 0.7,
    useAiValidation: true,
    reverse: false,
    discipline: {
        enableDiscipline: true,
        maxConsecutiveLosses: 3,
        cooldownPeriodMinutes: 30,
        dailyDrawdownLimit: 5,
        onFailure: 'Cooldown',
    },
};

const aiHybridStrategy: Strategy = {
    id: 'ai-hybrid',
    name: 'AI-Hybrid Surgical',
    description: 'High-precision hybrid strategy using technical confluence (EMA, RSI, CCI) for initial filtering, with Gemini AI acting as a surgical validation layer on entry signals.',
    async calculate(data: HistoricalData[], params: AIHybridParams = defaultAIHybridParams, symbol?: string): Promise<HistoricalData[]> {
        const dataWithIndicators = data.map(d => ({ ...d }));
        if (data.length < params.slowEmaPeriod) return dataWithIndicators;

        const closePrices = data.map(d => d.close);
        const emaFast = calculateEMA(closePrices, params.fastEmaPeriod);
        const emaSlow = calculateEMA(closePrices, params.slowEmaPeriod);
        const rsi = calculateRSI(closePrices, params.rsiPeriod);
        const cci = calculateCCI(data, params.cciPeriod);

        // We only process the last few candles for efficiency in live mode
        // But for backtesting, we loop through all
        for (let i = params.slowEmaPeriod; i < data.length; i++) {
            dataWithIndicators[i].ema_short = emaFast[i];
            dataWithIndicators[i].ema_long = emaSlow[i];
            dataWithIndicators[i].rsi = rsi[i];
            dataWithIndicators[i].cci = cci[i];

            if (i < 1) continue;

            const trendUp = emaFast[i]! > emaSlow[i]!;
            const trendDown = emaFast[i]! < emaSlow[i]!;
            
            const rsiBullish = rsi[i]! > 50;
            const rsiBearish = rsi[i]! < 50;
            
            const cciBullish = cci[i]! > 0;
            const cciBearish = cci[i]! < 0;

            let tentativeBuy = trendUp && rsiBullish && cciBullish && cci[i-1]! <= 0;
            let tentativeSell = trendDown && rsiBearish && cciBearish && cci[i-1]! >= 0;

            if (params.reverse) {
                const tmp = tentativeBuy;
                tentativeBuy = tentativeSell;
                tentativeSell = tmp;
            }

            // Surgical AI Layer - Only trigger on the latest candle if we have a signal
            if ((tentativeBuy || tentativeSell) && params.useAiValidation && i === data.length - 1 && symbol) {
                try {
                    const aiResult = await predictMarket({
                        symbol,
                        recentData: JSON.stringify(data.slice(-30)),
                        strategySignal: tentativeBuy ? 'BUY' : 'SELL'
                    });

                    const perspective = params.discipline.dailyDrawdownLimit > 5 ? aiResult.aggressive : aiResult.conservative;
                    
                    if (perspective.confidence >= params.minAiConfidence) {
                        if (tentativeBuy && perspective.prediction === 'UP') {
                            dataWithIndicators[i].buySignal = data[i].low;
                            dataWithIndicators[i].aiConfidence = perspective.confidence;
                            dataWithIndicators[i].aiReasoning = perspective.reasoning;
                        } else if (tentativeSell && perspective.prediction === 'DOWN') {
                            dataWithIndicators[i].sellSignal = data[i].high;
                            dataWithIndicators[i].aiConfidence = perspective.confidence;
                            dataWithIndicators[i].aiReasoning = perspective.reasoning;
                        }
                    }
                } catch (error) {
                    console.error("AI Validation failed:", error);
                    // Fallback: If AI fails, we might still want to signal or skip
                    // For "Senior" quality, we skip to avoid unvalidated risk
                }
            } else if ((tentativeBuy || tentativeSell) && !params.useAiValidation) {
                // No AI validation, use pure technicals
                if (tentativeBuy) dataWithIndicators[i].buySignal = data[i].low;
                if (tentativeSell) dataWithIndicators[i].sellSignal = data[i].high;
            }
        }

        return dataWithIndicators;
    }
};

export default aiHybridStrategy;
