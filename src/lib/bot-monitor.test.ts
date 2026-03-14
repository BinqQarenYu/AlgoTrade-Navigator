import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { BotMonitor } from './bot-monitor';
import type { BotHealthMetrics } from './bot-monitor';

describe('BotMonitor - performHealthCheck', () => {
  let monitor: BotMonitor;
  const botId = 'test-bot-123';
  let now: number;

  beforeEach(() => {
    monitor = new BotMonitor();
    now = Date.now();

    // Register the bot so it has initial metrics
    monitor.registerBot(botId, {});
  });

  afterEach(() => {
    // Crucial to clear intervals to prevent hang
    monitor.destroy();
  });

  // Helper to get and modify metrics easily in tests
  const getMetrics = (): BotHealthMetrics => {
    const metrics = (monitor as any).botMetrics.get(botId);
    assert(metrics, 'Metrics should exist after registration');
    return metrics;
  };

  test('should return offline for unknown botId', () => {
    const status = monitor.performHealthCheck('unknown-bot');
    assert.strictEqual(status, 'offline');
  });

  test('should return offline if time since update > 5 minutes (300000ms)', () => {
    const metrics = getMetrics();
    metrics.lastUpdate = now - 300001; // 5 mins and 1ms ago

    const status = monitor.performHealthCheck(botId);

    assert.strictEqual(status, 'offline');
    assert.strictEqual(metrics.status, 'offline');
  });

  test('should return critical if errors > 5', () => {
    const metrics = getMetrics();
    metrics.lastUpdate = now; // Fresh
    metrics.errors = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'];

    const status = monitor.performHealthCheck(botId);

    assert.strictEqual(status, 'critical');
    assert.strictEqual(metrics.status, 'critical');
  });

  test('should return critical if websocketStatus is error', () => {
    const metrics = getMetrics();
    metrics.lastUpdate = now; // Fresh
    metrics.websocketStatus = 'error';

    const status = monitor.performHealthCheck(botId);

    assert.strictEqual(status, 'critical');
    assert.strictEqual(metrics.status, 'critical');
  });

  test('should return warning if warnings > 3', () => {
    const metrics = getMetrics();
    metrics.lastUpdate = now; // Fresh
    metrics.winRate = 0.5; // Healthy win rate
    metrics.warnings = ['w1', 'w2', 'w3', 'w4'];

    const status = monitor.performHealthCheck(botId);

    assert.strictEqual(status, 'warning');
    assert.strictEqual(metrics.status, 'warning');
  });

  test('should return warning if winRate < 0.3', () => {
    const metrics = getMetrics();
    metrics.lastUpdate = now; // Fresh
    metrics.winRate = 0.29; // Low win rate

    const status = monitor.performHealthCheck(botId);

    assert.strictEqual(status, 'warning');
    assert.strictEqual(metrics.status, 'warning');
  });

  test('should return warning if time since update > 1 minute (60000ms) but <= 5 minutes', () => {
    const metrics = getMetrics();
    metrics.lastUpdate = now - 60001; // 1 min and 1ms ago
    metrics.winRate = 0.5; // Healthy

    const status = monitor.performHealthCheck(botId);

    assert.strictEqual(status, 'warning');
    assert.strictEqual(metrics.status, 'warning');
  });

  test('should return healthy if all conditions are good', () => {
    const metrics = getMetrics();
    metrics.lastUpdate = now; // Fresh
    metrics.winRate = 0.5; // Good
    metrics.errors = [];
    metrics.warnings = [];
    metrics.websocketStatus = 'connected';

    const status = monitor.performHealthCheck(botId);

    assert.strictEqual(status, 'healthy');
    assert.strictEqual(metrics.status, 'healthy');
  });
});
