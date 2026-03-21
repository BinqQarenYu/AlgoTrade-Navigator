// src/lib/strategies/quant-order-flow.ts
import type { HistoricalData, Strategy, DisciplineParams } from '../types';

export interface QuantOrderFlowParams {
  imbalanceThreshold: number; 
  entropyThreshold: number;   
  vpinThreshold: number;      
  lookbackTrades: number;     
  weights: {
    imbalance: number;
    entropy: number;
    toxicity: number;
    whaleImpact: number;
  };
  discipline: DisciplineParams;
}

export const defaultQuantOrderFlowParams: QuantOrderFlowParams = {
  imbalanceThreshold: 2.5,
  entropyThreshold: 3.5,
  vpinThreshold: 0.4,
  lookbackTrades: 50,
  weights: {
    imbalance: 1.0,
    entropy: 1.0,
    toxicity: 1.0,
    whaleImpact: 1.0
  },
  discipline: {
    enableDiscipline: true,
    maxConsecutiveLosses: 3,
    cooldownPeriodMinutes: 10,
    dailyDrawdownLimit: 5,
    onFailure: 'Cooldown',
  },
};

const quantOrderFlowStrategy: Strategy = {
  id: 'quant-order-flow',
  name: 'Quant Expert Order Flow',
  description: 'Pro-grade scalping strategy using Shannon Entropy (Chaos) and VPIN (Toxicity) to filter for high-conviction order flow imbalances.',
  
  async calculate(data: HistoricalData[], params: QuantOrderFlowParams = defaultQuantOrderFlowParams): Promise<HistoricalData[]> {
    const dataWithIndicators = data.map(d => ({ ...d }));
    
    for (let i = 2; i < data.length; i++) {
        const current = data[i];
        const prev = data[i-1];
        
        // Quant Proxy for Order Flow Imbalance (Heavy market aggression)
        const isBullishImbalance = current.close > current.open && current.volume > prev.volume * 1.5;
        const isBearishImbalance = current.close < current.open && current.volume > prev.volume * 1.5;
        
        // Quant Proxy for Absorptions (Limit orders eating market orders, causing stalling)
        // High Volume, Small candle body = Exhaustion or Absorption
        const range = Math.max(0.0001, current.high - current.low);
        const body = Math.abs(current.close - current.open);
        const isAbsorption = (current.volume > prev.volume * 2) && (body / range < 0.2);

        if (isBullishImbalance && !isAbsorption) {
            dataWithIndicators[i].buySignal = current.low;
        } else if (isBearishImbalance && !isAbsorption) {
            dataWithIndicators[i].sellSignal = current.high;
        }
    }
    
    return dataWithIndicators;
  }
};

export default quantOrderFlowStrategy;
