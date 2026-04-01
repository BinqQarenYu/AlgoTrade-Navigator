/**
 * market-analyst.ts
 * 
 * The Cognitive Brain of the Mother Node.
 * Function: Real-time Context + Microstructure Correlation.
 * Goal: Issue 'AI_SIGNAL' warnings to the Sentinel Cluster.
 */

import { runQuery, bufferSignal, SignalRecord } from '../db-service';
import { eventIngestor } from '../event-ingestor';
import { v4 as uuidv4 } from 'uuid';

class MarketAnalyst {
  private isProcessing = false;

  /**
   * Triggers a 'Deep Scan' of current market conditions.
   * Usually called after a News/ESH cycle.
   */
  public async conductMarketReview() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      console.log('[MarketAnalyst] 🧠 Commencing Deep Market Review...');
      
      // 1. Get the highest impact news in the last 15 minutes
      const recentEvents = await runQuery(`
        SELECT * FROM external_events 
        WHERE timestamp > ? AND level <= 2
        ORDER BY relevance_score DESC LIMIT 5
      `, [Date.now() - 15 * 60 * 1000]);

      if (!recentEvents || recentEvents.length === 0) {
        console.log('[MarketAnalyst] No high-impact events. Standing by.');
        this.isProcessing = false;
        return;
      }

      for (const event of recentEvents) {
        await this.analyzeAssetContext(event);
      }

    } catch (err) {
      console.error('[MarketAnalyst] Review failed:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  private async analyzeAssetContext(event: any) {
    const symbol = event.asset_scope === 'GLOBAL' ? 'BTCUSDT' : event.asset_scope;
    
    // 2. Fetch Microstructure Telemetry (VPIN/Entropy) for the asset
    const telemetry = await runQuery(`
      SELECT 
        avg(severity_score) as avg_toxic_flow,
        count(*) as anomaly_count
      FROM microstructure_events
      WHERE symbol = ? AND timestamp > ?
    `, [symbol, Date.now() - 30 * 60 * 1000]); // Last 30 mins

    const metrics = telemetry[0] || { avg_toxic_flow: 0, anomaly_count: 0 };

    // 3. SCIENTIFIC PROBABILITY CALCULATION
    // Formula: (News Relevance * 0.4) + (Toxicity * 0.4) + (Anomalies * 0.2)
    const rsWeight = (event.relevance_score / 10) * 0.4;
    const toxicWeight = (Math.min(Number(metrics.avg_toxic_flow), 100) / 100) * 0.4;
    const anomalyWeight = (Math.min(Number(metrics.anomaly_count), 50) / 50) * 0.2;

    const totalProbability = (rsWeight + toxicWeight + anomalyWeight) * 100;

    console.log(`[MarketAnalyst] 📊 Analysis for ${symbol}: ${totalProbability.toFixed(1)}% Collision Probability`);

    // 4. GENERATE SIGNAL IF > 70%
    if (totalProbability > 70) {
      this.emitSignal(symbol, event, totalProbability);
    }
  }

  private emitSignal(symbol: string, cause: any, probability: number) {
    const signal: SignalRecord = {
      signal_id: `AI-SIG-${uuidv4().slice(0, 8)}`,
      timestamp: Date.now(),
      symbol: symbol,
      strategy_id: 'CONTEXT_SENTINEL_V1',
      signal_type: probability > 85 ? 'SELL' : 'BUY', // Simplified for now
      entry_price: 0, // Placeholder
      feature_vector: JSON.stringify({
        prob: probability,
        news_id: cause.event_id,
        headline: cause.headline
      }),
      machine_id: 'MOTHER-ANALYST'
    };

    bufferSignal(signal);
    console.log(`[MarketAnalyst] 🚨 CRITICAL SIGNAL EMITTED: ${symbol} @ ${probability.toFixed(1)}%`);
    
    // Broadcast to Nerve (UI Listener)
    const { pulseNerve } = require('../nerve-center');
    pulseNerve({
        type: 'AI_SIGNAL',
        payload: {
            signal_id: signal.signal_id,
            symbol: signal.symbol,
            probability: probability.toFixed(1),
            strategy: signal.strategy_id,
            headline: cause.headline,
            timestamp: signal.timestamp
        },
        machine_id: 'MOTHER-ANALYST'
    });
  }
}

export const marketAnalyst = new MarketAnalyst();
