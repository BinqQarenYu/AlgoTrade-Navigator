'use client';
import type { Strategy, HistoricalData } from '../types';
import { NanoInferenceEngine } from '../nano-inference-service';

export interface NanoMicroscopeParams {
  modelPath: string;
  useAiValidation: boolean;
}

export const defaultNanoMicroscopeParams: NanoMicroscopeParams = {
  modelPath: '/models/nano_microscope.onnx',
  useAiValidation: true,
};

const engineCache = new Map<string, NanoInferenceEngine>();

const nanoMicroscopeStrategy: Strategy = {
  id: 'nano-microscope',
  name: 'Nano Microscope AI',
  description: 'High-frequency order flow strategy using ONNX-based dual-stream neural network processing 13 toxic and 60 spatial features.',
  async calculate(data: HistoricalData[], params: NanoMicroscopeParams = defaultNanoMicroscopeParams): Promise<HistoricalData[]> {
    const dataWithIndicators = data.map(d => ({ ...d }));

    let engine: NanoInferenceEngine | null = null;

    if (params.useAiValidation) {
      if (!engineCache.has(params.modelPath)) {
        const newEngine = new NanoInferenceEngine(params.modelPath);
        await newEngine.init();
        engineCache.set(params.modelPath, newEngine);
      }
      engine = engineCache.get(params.modelPath)!;
    }

    if (params.useAiValidation && engine) {
      const validIndices: number[] = [];
      const toxicBatch: number[][] = [];
      const spatialBatch: number[][] = [];

      for (let i = 0; i < dataWithIndicators.length; i++) {
        const current = dataWithIndicators[i];
        
        // If we don't have order flow data, we can't run this strategy on this candle
        if (current.toxic_features && current.spatial_features && current.toxic_features.length === 13 && current.spatial_features.length === 60) {
          validIndices.push(i);
          toxicBatch.push(current.toxic_features);
          spatialBatch.push(current.spatial_features);
        }
      }

      if (toxicBatch.length > 0) {
        try {
          const results = await engine.processBatch(toxicBatch, spatialBatch);
          
          for (let j = 0; j < validIndices.length; j++) {
            const i = validIndices[j];
            const current = dataWithIndicators[i];
            const result = results[j];
            
            current.aiConfidence = result.confidence;
            if (result.signal === 'LONG') {
              current.buySignal = current.low; 
              current.aiReasoning = `ONNX inference returned LONG with ${Math.round(result.confidence * 100)}% confidence`;
            } else if (result.signal === 'SHORT') {
              current.sellSignal = current.high;
              current.aiReasoning = `ONNX inference returned SHORT with ${Math.round(result.confidence * 100)}% confidence`;
            } else {
              current.aiReasoning = `ONNX inference returned WAIT with ${Math.round(result.confidence * 100)}% confidence`;
            }
          }
        } catch (error) {
          console.error("Nano Microscope inference failed:", error);
        }
      }
    }

    return dataWithIndicators;
  }
};

export default nanoMicroscopeStrategy;

