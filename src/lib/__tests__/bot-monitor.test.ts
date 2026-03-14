import { describe, it, beforeEach, afterEach, mock, after } from 'node:test';
import assert from 'node:assert';
import { botMonitor } from '../bot-monitor';
import { emergencyStop } from '../emergency-stop';
import type { LiveBotStateForAsset } from '../types';

describe('botMonitor.runDiagnostics()', () => {
  beforeEach(() => {
    botMonitor.destroy();
    mock.restoreAll();
  });

  afterEach(() => {
    botMonitor.destroy();
    mock.restoreAll();
  });

  it('should return healthy overallHealth when there are no issues', () => {
    botMonitor.registerBot('bot1', {});
    botMonitor.updateBotState('bot1', { status: 'running' } as LiveBotStateForAsset);

    const metrics = botMonitor.getBotMetrics('bot1');
    assert.ok(metrics, 'bot1 metrics should exist');
    metrics.status = 'healthy';
    metrics.apiCallsPerMinute = 10;

    const diagnostics = botMonitor.runDiagnostics();

    assert.strictEqual(diagnostics.overallHealth, 'healthy');
    assert.strictEqual(diagnostics.issues.length, 0);
    assert.strictEqual(diagnostics.recommendations.length, 0);
  });

  it('should return critical overallHealth when emergency stop is active', () => {
    mock.method(emergencyStop, 'isEmergencyActive', () => true);

    const diagnostics = botMonitor.runDiagnostics();

    assert.strictEqual(diagnostics.overallHealth, 'critical');
    assert.ok(diagnostics.issues.some(i => i.includes('Emergency stop')));
    assert.ok(diagnostics.recommendations.some(r => r.includes('emergency conditions')));
  });

  it('should return critical overallHealth when there are critical bots', () => {
    botMonitor.registerBot('critical-bot', {});
    botMonitor.updateBotState('critical-bot', { status: 'running' } as LiveBotStateForAsset);

    botMonitor.recordError('critical-bot', 'Test error', 'critical');
    botMonitor.recordError('critical-bot', 'Test error 2', 'critical');

    const metrics = botMonitor.getBotMetrics('critical-bot');
    assert.ok(metrics, 'critical-bot metrics should exist');
    metrics.status = 'critical';

    const diagnostics = botMonitor.runDiagnostics();

    assert.strictEqual(diagnostics.overallHealth, 'critical');
    assert.ok(diagnostics.issues.some(i => i.includes('critical state')));
    assert.ok(diagnostics.recommendations.some(r => r.includes('restart critical bots')));
  });

  it('should return warning overallHealth for high API usage', () => {
    botMonitor.registerBot('api-bot', {});
    botMonitor.updateBotState('api-bot', { status: 'running' } as LiveBotStateForAsset);

    const metrics = botMonitor.getBotMetrics('api-bot');
    assert.ok(metrics, 'api-bot metrics should exist');
    metrics.status = 'healthy';
    metrics.apiCallsPerMinute = 205;

    const diagnostics = botMonitor.runDiagnostics();

    assert.strictEqual(diagnostics.overallHealth, 'warning');
    assert.ok(diagnostics.issues.some(i => i.includes('High API call rate')));
    assert.ok(diagnostics.recommendations.some(r => r.includes('polling frequency')));
  });

  it('should return warning overallHealth when more than half of bots are offline', () => {
    botMonitor.registerBot('bot1', {});
    botMonitor.registerBot('bot2', {});
    botMonitor.registerBot('bot3', {});

    botMonitor.updateBotState('bot1', { status: 'idle' } as LiveBotStateForAsset);
    botMonitor.updateBotState('bot2', { status: 'idle' } as LiveBotStateForAsset);
    botMonitor.updateBotState('bot3', { status: 'running' } as LiveBotStateForAsset);

    const diagnostics = botMonitor.runDiagnostics();

    assert.strictEqual(diagnostics.overallHealth, 'warning');
    assert.ok(diagnostics.issues.some(i => i.includes('More than half of bots are offline')));
    assert.ok(diagnostics.recommendations.some(r => r.includes('network connectivity')));
  });

  it('should handle combined issues and prioritize critical health status', () => {
    mock.method(emergencyStop, 'isEmergencyActive', () => true);

    botMonitor.registerBot('bot1', {});
    botMonitor.updateBotState('bot1', { status: 'running' } as LiveBotStateForAsset);

    const metrics = botMonitor.getBotMetrics('bot1');
    assert.ok(metrics, 'bot1 metrics should exist');
    metrics.apiCallsPerMinute = 300;

    const diagnostics = botMonitor.runDiagnostics();

    assert.strictEqual(diagnostics.overallHealth, 'critical');
    assert.ok(diagnostics.issues.some(i => i.includes('Emergency stop')));
    assert.ok(diagnostics.issues.some(i => i.includes('High API call rate')));
    assert.strictEqual(diagnostics.issues.length, 2);
    assert.strictEqual(diagnostics.recommendations.length, 2);
  });
});

after(() => {
  botMonitor.destroy();
  setTimeout(() => process.exit(0), 10);
});
