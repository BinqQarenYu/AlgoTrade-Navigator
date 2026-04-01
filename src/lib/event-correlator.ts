/**
 * event-correlator.ts
 * 
 * Deep Research Engine for the AlgoTrade-Navigator.
 * Scientifically links "Cause" (News/Macro) with "Effect" (VPIN/Whale Spikes).
 */

import { runQuery } from './db-service';

export interface CorrelatedContext {
  event_id: string;
  headline: string;
  source: string;
  microstructure_events: any[]; // The linked anomalies
  magnitude_delta: number; // Volatility multiplier
}

/**
 * Searches for market anomalies that occurred ±5 minutes from a specific event.
 */
export async function correlateEventWithMarket(eventId: string): Promise<CorrelatedContext | null> {
  // 1. Fetch the event
  const events = await runQuery('SELECT * FROM external_events WHERE event_id = ?', [eventId]);
  if (!events || events.length === 0) return null;
  const event = events[0];

  const windowStart = event.timestamp - (5 * 60 * 1000);
  const windowEnd = event.timestamp + (5 * 60 * 1000);

  // 2. Look for anomalies in that window
  // If event is GLOBAL (e.g. Fed), look for ANY top-tier anomaly.
  // If event is specific (e.g. BTC), look for BTC anomalies.
  let microQuery = `
    SELECT * FROM microstructure_events 
    WHERE timestamp BETWEEN ? AND ?
  `;
  const params = [windowStart, windowEnd];

  if (event.asset_scope && event.asset_scope !== 'GLOBAL') {
    microQuery += ' AND symbol = ?';
    params.push(event.asset_scope);
  }

  const matches = await runQuery(microQuery, params);

  return {
    event_id: event.event_id,
    headline: event.headline,
    source: event.source,
    microstructure_events: matches,
    magnitude_delta: matches.length > 0 ? (matches.length * 1.5) : 1.0
  };
}
