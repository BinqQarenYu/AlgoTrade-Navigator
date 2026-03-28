/**
 * child-heartbeat.ts
 * 
 * Shared global state for tracking the last heartbeat received from any Child/Sentinel node.
 * HeadlessSentry reads this to decide whether to activate as a failover scanner.
 * The Ingest API writes to this on every successful child payload.
 * 
 * Uses globalThis to persist across Next.js HMR reloads.
 */

const globalHeartbeat = globalThis as unknown as { lastChildHeartbeat: number };
if (!globalHeartbeat.lastChildHeartbeat) globalHeartbeat.lastChildHeartbeat = 0;

/** Called by /api/ingest when a child sends data or a heartbeat */
export function updateChildHeartbeat(): void {
  globalHeartbeat.lastChildHeartbeat = Date.now();
}

/** Called by HeadlessSentry to check if a child is alive */
export function getLastChildHeartbeat(): number {
  return globalHeartbeat.lastChildHeartbeat;
}

/** Returns true if a child has sent a heartbeat within the last `thresholdMs` milliseconds */
export function isChildAlive(thresholdMs: number = 30_000): boolean {
  if (globalHeartbeat.lastChildHeartbeat === 0) return false; // Never received a heartbeat
  return (Date.now() - globalHeartbeat.lastChildHeartbeat) < thresholdMs;
}
