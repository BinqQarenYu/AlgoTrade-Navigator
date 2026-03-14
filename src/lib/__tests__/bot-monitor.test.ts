import { describe, it, beforeEach, afterEach, after, mock } from 'node:test';
import * as assert from 'node:assert';

// We must mock timers BEFORE importing the modules that start timers


import { BotMonitor, botMonitor } from '../bot-monitor';
import { emergencyStop } from '../emergency-stop';

describe('BotMonitor.getSystemHealth', () => {
  let monitor: BotMonitor;

  beforeEach(() => {
    monitor = new BotMonitor();
  });

  afterEach(() => {
    monitor.destroy();
  });

  it('should return empty stats when no bots are registered', () => {
    const stats = monitor.getSystemHealth();
    assert.strictEqual(stats.totalBots, 0);
    assert.strictEqual(stats.activeBots, 0);
    assert.strictEqual(stats.healthyBots, 0);
    assert.strictEqual(stats.warningBots, 0);
    assert.strictEqual(stats.criticalBots, 0);
    assert.strictEqual(stats.offlineBots, 0);
    assert.strictEqual(stats.totalMemoryUsage, 0);
    assert.strictEqual(stats.totalApiCalls, 0);

    assert.ok(typeof stats.systemUptime === 'number');
    assert.strictEqual(typeof stats.emergencyStopActive, 'boolean');
  });

  it('should correctly aggregate bot states', () => {
    monitor.registerBot('bot1', {});
    monitor.registerBot('bot2', {});
    monitor.registerBot('bot3', {});

    const stats = monitor.getSystemHealth();

    assert.strictEqual(stats.totalBots, 3);
    assert.strictEqual(stats.healthyBots, 3);
    assert.strictEqual(stats.activeBots, 3);
    assert.strictEqual(stats.warningBots, 0);
    assert.strictEqual(stats.criticalBots, 0);
    assert.strictEqual(stats.offlineBots, 0);
  });

  it('should calculate active bots correctly based on status', () => {
    monitor.registerBot('bot1', {});
    monitor.registerBot('bot2', {});
    monitor.registerBot('bot3', {});
    monitor.registerBot('bot4', {});

    const allMetrics = monitor.getAllBotMetrics();

    const bot1 = allMetrics.get('bot1');
    if (bot1) bot1.status = 'warning';

    const bot2 = allMetrics.get('bot2');
    if (bot2) bot2.status = 'critical';

    const bot3 = allMetrics.get('bot3');
    if (bot3) bot3.status = 'offline';

    const stats = monitor.getSystemHealth();

    assert.strictEqual(stats.totalBots, 4);
    assert.strictEqual(stats.healthyBots, 1);
    assert.strictEqual(stats.warningBots, 1);
    assert.strictEqual(stats.criticalBots, 1);
    assert.strictEqual(stats.offlineBots, 1);
    assert.strictEqual(stats.activeBots, 3);
  });

  it('should sum total memory usage and api calls', () => {
    monitor.registerBot('bot1', {});
    monitor.registerBot('bot2', {});

    const allMetrics = monitor.getAllBotMetrics();

    const bot1 = allMetrics.get('bot1');
    if (bot1) {
      bot1.memoryUsage = 150;
      bot1.apiCallsPerMinute = 25;
    }

    const bot2 = allMetrics.get('bot2');
    if (bot2) {
      bot2.memoryUsage = 250;
      bot2.apiCallsPerMinute = 15;
    }

    const stats = monitor.getSystemHealth();

    assert.strictEqual(stats.totalMemoryUsage, 400);
    assert.strictEqual(stats.totalApiCalls, 40);
  });

  it('should accurately reflect emergencyStop active state', () => {
    const stats = monitor.getSystemHealth();
    assert.strictEqual(stats.emergencyStopActive, emergencyStop.isEmergencyActive());
  });

  after(() => {
    botMonitor.destroy();
    emergencyStop.destroy();

  });
});
