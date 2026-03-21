// src/lib/ai-training-service.ts
import { SignalRecord } from "./db-service";

/**
 * Client-side service to handle Bayesian Signal Logging and RAG Training Ingress.
 */
export const aiTrainingService = {
  /**
   * Log a new signal to the DuckDB Bayesian Vault.
   * CAPTURES: MFV (Microstructure Feature Vector)
   */
  async logSignal(signal: Partial<SignalRecord>): Promise<string | null> {
    try {
      const response = await fetch('/api/ai/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...signal,
          signal_id: signal.signal_id || `signal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: Date.now(),
          outcome: 'OPEN'
        })
      });

      if (!response.ok) throw new Error('Failed to log signal');
      const data = await response.json();
      return data.signal_id;
    } catch (error) {
      console.error('[AI Training Service] Signal logging failed:', error);
      return null;
    }
  },

  /**
   * Record the outcome of a signal for Bayesian Posterior update.
   */
  async recordOutcome(signal_id: string, outcome: 'WIN' | 'LOSS', exit_price: number, profit_delta: number): Promise<boolean> {
    try {
      const response = await fetch('/api/ai/signals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal_id, outcome, exit_price, profit_delta })
      });

      return response.ok;
    } catch (error) {
      console.error('[AI Training Service] Outcome recording failed:', error);
      return false;
    }
  }
};
