import test, { after } from 'node:test';
import assert from 'node:assert';

// We mock timers before importing anything to prevent global intervals from keeping the process alive
import { mock } from 'node:test';
mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });

import { BotMonitor, botMonitor as globalBotMonitor } from './bot-monitor';
import { emergencyStop } from './emergency-stop';

test('BotMonitor', async (t) => {
  await t.test('registerBot adds a bot with default healthy metrics', () => {
    const monitor = new BotMonitor();

    try {
      const botId = 'test-bot-123';
      const config = { pair: 'BTC/USDT' };

      monitor.registerBot(botId, config);

      const metrics = monitor.getBotMetrics(botId);

      assert.ok(metrics, 'Metrics should exist for the registered bot');
      assert.strictEqual(metrics.botId, botId);
      assert.strictEqual(metrics.status, 'healthy');
      assert.strictEqual(metrics.uptime, 0);
      assert.strictEqual(metrics.totalTrades, 0);
      assert.strictEqual(metrics.successfulTrades, 0);
      assert.strictEqual(metrics.failedTrades, 0);
      assert.strictEqual(metrics.winRate, 0);
      assert.strictEqual(metrics.currentPnl, 0);
      assert.strictEqual(metrics.maxDrawdown, 0);
      assert.strictEqual(metrics.avgExecutionTime, 0);
      assert.strictEqual(metrics.websocketStatus, 'disconnected');
      assert.strictEqual(metrics.apiCallsPerMinute, 0);
      assert.strictEqual(metrics.memoryUsage, 0);
      assert.deepStrictEqual(metrics.errors, []);
      assert.deepStrictEqual(metrics.warnings, []);

      // lastUpdate should be reasonably close to now
      const now = Date.now();
      assert.ok(now - metrics.lastUpdate < 1000, 'lastUpdate should be recently populated');

    } finally {
      monitor.destroy();
    }
  });

  await t.test('registerBot overrides existing bot if registered again', () => {
    const monitor = new BotMonitor();

    try {
      const botId = 'test-bot-override';

      // Register first time
      monitor.registerBot(botId, {});

      const firstMetrics = monitor.getBotMetrics(botId);
      assert.ok(firstMetrics);
      firstMetrics.status = 'critical';
      firstMetrics.totalTrades = 10;

      // Register again - it should overwrite with fresh metrics
      monitor.registerBot(botId, {});

      const newMetrics = monitor.getBotMetrics(botId);
      assert.ok(newMetrics);
      assert.strictEqual(newMetrics.status, 'healthy', 'Status should be reset');
      assert.strictEqual(newMetrics.totalTrades, 0, 'Trades should be reset');

    } finally {
      monitor.destroy();
    }
  });
});

after(() => {
  // Clean up global singletons that keep the event loop alive due to timers
  globalBotMonitor.destroy();
  emergencyStop.destroy();
  mock.timers.reset();
});
