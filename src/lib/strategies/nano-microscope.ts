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

let engine: NanoInferenceEngine | null = null;

const nanoMicroscopeStrategy: Strategy = {
  id: 'nano-microscope',
  name: 'Nano Microscope AI',
  description: 'High-frequency order flow strategy using ONNX-based dual-stream neural network processing 13 toxic and 60 spatial features.',
  async calculate(data: HistoricalData[], params: NanoMicroscopeParams = defaultNanoMicroscopeParams): Promise<HistoricalData[]> {
    const dataWithIndicators = data.map(d => ({ ...d }));

    // Initialize engine singleton if not initialized
    if (params.useAiValidation && !engine) {
      engine = new NanoInferenceEngine(params.modelPath);
      await engine.init();
    }

    for (let i = 0; i < dataWithIndicators.length; i++) {
      const current = dataWithIndicators[i];
      
      // If we don't have order flow data, we can't run this strategy on this candle
      if (!current.toxic_features || !current.spatial_features || current.toxic_features.length !== 13 || current.spatial_features.length !== 60) {
        continue;
      }

      if (params.useAiValidation && engine) {
        try {
          const result = await engine.processTick(current.toxic_features, current.spatial_features);
          
          if (result.signal === 'LONG') {
            current.buySignal = current.low; // or close, depending on preference
            current.aiConfidence = result.confidence;
            current.aiReasoning = `ONNX inference returned LONG with ${Math.round(result.confidence * 100)}% confidence`;
          } else if (result.signal === 'SHORT') {
            current.sellSignal = current.high;
            current.aiConfidence = result.confidence;
            current.aiReasoning = `ONNX inference returned SHORT with ${Math.round(result.confidence * 100)}% confidence`;
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
