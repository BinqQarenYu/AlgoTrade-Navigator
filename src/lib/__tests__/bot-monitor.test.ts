import { describe, it, beforeEach, afterEach, afterAll, expect, vi } from 'vitest';
import { BotMonitor, botMonitor } from '../bot-monitor';
import { emergencyStop } from '../emergency-stop';
import type { LiveBotStateForAsset } from '../types';

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
    expect(stats.totalBots).toBe(0);
    expect(stats.activeBots).toBe(0);
    expect(stats.healthyBots).toBe(0);
    expect(stats.warningBots).toBe(0);
    expect(stats.criticalBots).toBe(0);
    expect(stats.offlineBots).toBe(0);
    expect(stats.totalMemoryUsage).toBe(0);
    expect(stats.totalApiCalls).toBe(0);

    expect(typeof stats.systemUptime).toBe('number');
    expect(typeof stats.emergencyStopActive).toBe('boolean');
  });

  it('should correctly aggregate bot states', () => {
    monitor.registerBot('bot1', {});
    monitor.registerBot('bot2', {});
    monitor.registerBot('bot3', {});

    const stats = monitor.getSystemHealth();

    expect(stats.totalBots).toBe(3);
    expect(stats.healthyBots).toBe(3);
    expect(stats.activeBots).toBe(3);
    expect(stats.warningBots).toBe(0);
    expect(stats.criticalBots).toBe(0);
    expect(stats.offlineBots).toBe(0);
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

    expect(stats.totalBots).toBe(4);
    expect(stats.healthyBots).toBe(1);
    expect(stats.warningBots).toBe(1);
    expect(stats.criticalBots).toBe(1);
    expect(stats.offlineBots).toBe(1);
    expect(stats.activeBots).toBe(3);
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

    expect(stats.totalMemoryUsage).toBe(400);
    expect(stats.totalApiCalls).toBe(40);
  });

  it('should accurately reflect emergencyStop active state', () => {
    const stats = monitor.getSystemHealth();
    expect(stats.emergencyStopActive).toBe(emergencyStop.isEmergencyActive());
  });

  afterAll(() => {
    botMonitor.destroy();
    emergencyStop.destroy();
  });
});

describe('botMonitor.runDiagnostics()', () => {
  beforeEach(() => {
    botMonitor.destroy();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    botMonitor.destroy();
    vi.restoreAllMocks();
  });

  it('should return healthy overallHealth when there are no issues', () => {
    botMonitor.registerBot('bot1', {});
    botMonitor.updateBotState('bot1', { status: 'running' } as LiveBotStateForAsset);

    const metrics = botMonitor.getBotMetrics('bot1');
    expect(metrics).toBeDefined();
    if (metrics) {
      metrics.status = 'healthy';
      metrics.apiCallsPerMinute = 10;
    }

    const diagnostics = botMonitor.runDiagnostics();

    expect(diagnostics.overallHealth).toBe('healthy');
    expect(diagnostics.issues.length).toBe(0);
    expect(diagnostics.recommendations.length).toBe(0);
  });

  it('should return critical overallHealth when emergency stop is active', () => {
    vi.spyOn(emergencyStop, 'isEmergencyActive').mockReturnValue(true);

    const diagnostics = botMonitor.runDiagnostics();

    expect(diagnostics.overallHealth).toBe('critical');
    expect(diagnostics.issues.some(i => i.includes('Emergency stop'))).toBe(true);
    expect(diagnostics.recommendations.some(r => r.includes('emergency conditions'))).toBe(true);
  });

  it('should return critical overallHealth when there are critical bots', () => {
    botMonitor.registerBot('critical-bot', {});
    botMonitor.updateBotState('critical-bot', { status: 'running' } as LiveBotStateForAsset);

    botMonitor.recordError('critical-bot', 'Test error', 'critical');
    botMonitor.recordError('critical-bot', 'Test error 2', 'critical');

    const metrics = botMonitor.getBotMetrics('critical-bot');
    expect(metrics).toBeDefined();
    if (metrics) {
      metrics.status = 'critical';
    }

    const diagnostics = botMonitor.runDiagnostics();

    expect(diagnostics.overallHealth).toBe('critical');
    expect(diagnostics.issues.some(i => i.includes('critical state'))).toBe(true);
    expect(diagnostics.recommendations.some(r => r.includes('restart critical bots'))).toBe(true);
  });

  it('should return warning overallHealth for high API usage', () => {
    botMonitor.registerBot('api-bot', {});
    botMonitor.updateBotState('api-bot', { status: 'running' } as LiveBotStateForAsset);

    const metrics = botMonitor.getBotMetrics('api-bot');
    expect(metrics).toBeDefined();
    if (metrics) {
      metrics.status = 'healthy';
      metrics.apiCallsPerMinute = 205;
    }

    const diagnostics = botMonitor.runDiagnostics();

    expect(diagnostics.overallHealth).toBe('warning');
    expect(diagnostics.issues.some(i => i.includes('High API call rate'))).toBe(true);
    expect(diagnostics.recommendations.some(r => r.includes('polling frequency'))).toBe(true);
  });

  it('should return warning overallHealth when more than half of bots are offline', () => {
    botMonitor.registerBot('bot1', {});
    botMonitor.registerBot('bot2', {});
    botMonitor.registerBot('bot3', {});

    botMonitor.updateBotState('bot1', { status: 'idle' } as LiveBotStateForAsset);
    botMonitor.updateBotState('bot2', { status: 'idle' } as LiveBotStateForAsset);
    botMonitor.updateBotState('bot3', { status: 'running' } as LiveBotStateForAsset);

    const diagnostics = botMonitor.runDiagnostics();

    expect(diagnostics.overallHealth).toBe('warning');
    expect(diagnostics.issues.some(i => i.includes('More than half of bots are offline'))).toBe(true);
    expect(diagnostics.recommendations.some(r => r.includes('network connectivity'))).toBe(true);
  });

  it('should handle combined issues and prioritize critical health status', () => {
    vi.spyOn(emergencyStop, 'isEmergencyActive').mockReturnValue(true);

    botMonitor.registerBot('bot1', {});
    botMonitor.updateBotState('bot1', { status: 'running' } as LiveBotStateForAsset);

    const metrics = botMonitor.getBotMetrics('bot1');
    expect(metrics).toBeDefined();
    if (metrics) {
      metrics.apiCallsPerMinute = 300;
    }

    const diagnostics = botMonitor.runDiagnostics();

    expect(diagnostics.overallHealth).toBe('critical');
    expect(diagnostics.issues.some(i => i.includes('Emergency stop'))).toBe(true);
    expect(diagnostics.issues.some(i => i.includes('High API call rate'))).toBe(true);
    expect(diagnostics.issues.length).toBe(2);
    expect(diagnostics.recommendations.length).toBe(2);
  });
});

afterAll(() => {
  botMonitor.destroy();
  emergencyStop.destroy();
});
