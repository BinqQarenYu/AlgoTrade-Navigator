import * as ort from 'onnxruntime-web';

// Decision thresholds
const LONG_THRESHOLD = 0.70;
const SHORT_THRESHOLD = 0.70;

export interface NanoInferenceResult {
  signal: 'LONG' | 'SHORT' | 'WAIT';
  confidence: number;
  prob_long: number;
  prob_short: number;
  prob_wait: number;
}

export class NanoInferenceEngine {
  private session: ort.InferenceSession | null = null;
  private modelPath: string;

  constructor(modelPath: string = '/models/nano_microscope.onnx') {
    this.modelPath = modelPath;
  }

  async init() {
    if (this.session) return;
    try {
      // Add a timestamp query parameter to bypass browser cache and ensure the latest model is loaded
      const cacheBustingUrl = `${this.modelPath}?v=${Date.now()}`;
      this.session = await ort.InferenceSession.create(cacheBustingUrl, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all'
      });
      console.log(`[NanoEngine] ONNX model loaded from: ${this.modelPath}`);
    } catch (error) {
      console.warn(`[NanoEngine] Failed to load model at ${this.modelPath}. Running in STUB mode.`, error);
      this.session = null;
    }
  }

  async processTick(toxicFeatures: number[], spatialFeatures: number[]): Promise<NanoInferenceResult> {
    if (!this.session) {
      return {
        signal: 'WAIT',
        confidence: 1.0,
        prob_long: 0.0,
        prob_short: 0.0,
        prob_wait: 1.0
      };
    }

    try {
      // Inputs expect Float32Arrays of shape [1, 13] and [1, 60]
      const toxicFloat32 = Float32Array.from(toxicFeatures);
      const spatialFloat32 = Float32Array.from(spatialFeatures);

      const toxicTensor = new ort.Tensor('float32', toxicFloat32, [1, 13]);
      const spatialTensor = new ort.Tensor('float32', spatialFloat32, [1, 60]);

      const feeds: Record<string, ort.Tensor> = {
        toxic_input: toxicTensor,
        spatial_input: spatialTensor
      };

      const results = await this.session.run(feeds);
      
      // The output node name is assumed to be the first key if we don't know it
      const outputKey = this.session.outputNames[0];
      const logits = results[outputKey].data as Float32Array;

      // Softmax manually
      const maxLogit = Math.max(logits[0], logits[1], logits[2]);
      const exp = [
        Math.exp(logits[0] - maxLogit),
        Math.exp(logits[1] - maxLogit),
        Math.exp(logits[2] - maxLogit)
      ];
      const sumExp = exp[0] + exp[1] + exp[2];
      const probs = exp.map(e => e / sumExp);

      const long_p = probs[0];
      const short_p = probs[1];
      const wait_p = probs[2];

      let signal: 'LONG' | 'SHORT' | 'WAIT' = 'WAIT';
      let confidence = wait_p;

      if (long_p >= LONG_THRESHOLD) {
        signal = 'LONG';
        confidence = long_p;
      } else if (short_p >= SHORT_THRESHOLD) {
        signal = 'SHORT';
        confidence = short_p;
      } else {
        signal = 'WAIT';
        confidence = wait_p;
      }

      return {
        signal,
        confidence,
        prob_long: long_p,
        prob_short: short_p,
        prob_wait: wait_p
      };
    } catch (error) {
      console.error("[NanoEngine] Inference error:", error);
      return {
        signal: 'WAIT',
        confidence: 1.0,
        prob_long: 0.0,
        prob_short: 0.0,
        prob_wait: 1.0
      };
    }
  }
}
