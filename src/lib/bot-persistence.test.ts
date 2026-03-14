import { describe, it, mock, beforeEach, afterEach, after } from 'node:test';
import assert from 'node:assert';

const originalSetInterval = global.setInterval;
(global as any).setInterval = function(callback: any, ms: number) {
  const timer = originalSetInterval(callback, ms);
  if (timer && typeof timer.unref === 'function') {
    timer.unref(); // Don't keep process alive
  }
  return timer;
};

const originalSetTimeout = global.setTimeout;
(global as any).setTimeout = function(callback: any, ms: number) {
  const timer = originalSetTimeout(callback, ms);
  if (timer && typeof timer.unref === 'function') {
    timer.unref(); // Don't keep process alive
  }
  return timer;
};

import { BotPersistence, botPersistence as singletonBotPersistence } from './bot-persistence';

describe('BotPersistence - getStorageStats', () => {
  let botPersistence: BotPersistence;

  after(() => {
    // Clean up singleton instance created on module load
    if (singletonBotPersistence) {
      singletonBotPersistence.destroy();
    }
  });

  beforeEach(() => {
    // Mock global window object and localStorage
    (global as any).window = {};
    const store = new Map();
    (global as any).localStorage = {
      getItem: mock.fn((key: string) => store.get(key) || null),
      setItem: mock.fn((key: string, value: string) => store.set(key, value)),
      removeItem: mock.fn((key: string) => store.delete(key)),
    };

    botPersistence = new BotPersistence({
      storageKey: 'test-trading-bot-state',
      autoSaveInterval: 30000,
      maxStateHistory: 10,
      compressionEnabled: false,
    });
  });

  afterEach(() => {
    if (botPersistence) {
      botPersistence.destroy();
    }
    delete (global as any).window;
    delete (global as any).localStorage;
    mock.restoreAll();
  });

  it('should return default stats when window is undefined', async () => {
    delete (global as any).window; // Simulate SSR / server environment
    const stats = await botPersistence.getStorageStats();
    assert.deepStrictEqual(stats, {
      totalStates: 0,
      storageSize: 0,
      oldestState: null,
      newestState: null,
    });
  });

  it('should return accurate stats for populated storage', async () => {
    const states = {
      'bot1': {
        botId: 'bot1',
        config: { id: 'c1', asset: 'BTC', strategy: 'RSI' },
        activePosition: null,
        status: 'running',
        lastActivity: 1000,
        consecutiveLosses: 0,
        sessionPnl: 0,
        cooldownUntil: null,
        riskGuardianState: null,
        websocketConfig: { reconnectAttempts: 0, lastConnectionTime: 1000 }
      },
      'bot2': {
        botId: 'bot2',
        config: { id: 'c2', asset: 'ETH', strategy: 'MACD' },
        activePosition: null,
        status: 'idle',
        lastActivity: 2000,
        consecutiveLosses: 0,
        sessionPnl: 0,
        cooldownUntil: null,
        riskGuardianState: null,
        websocketConfig: { reconnectAttempts: 0, lastConnectionTime: 2000 }
      }
    };

    const stringifiedStates = JSON.stringify(states);
    (global as any).localStorage.setItem('test-trading-bot-state', stringifiedStates);

    const stats = await botPersistence.getStorageStats();

    assert.strictEqual(stats.totalStates, 2);
    assert.ok(stats.storageSize > 0, 'Storage size should be greater than 0');
    // Buffer.byteLength since in Node.js Blob handles text as utf-8 equivalent.
    // In our test, stringifiedStates takes some space.
    const expectedSize = new Blob([stringifiedStates]).size;
    assert.strictEqual(stats.storageSize, expectedSize);
    assert.strictEqual(stats.oldestState, 1000);
    assert.strictEqual(stats.newestState, 2000);
  });

  it('should handle errors gracefully and return default stats', async () => {
    const invalidData = 'invalid-json';
    (global as any).localStorage.setItem('test-trading-bot-state', invalidData);

    const stats = await botPersistence.getStorageStats();

    assert.deepStrictEqual(stats, {
      totalStates: 0,
      storageSize: new Blob([invalidData]).size,
      oldestState: null,
      newestState: null,
    });
  });

  it('should return correct stats when localStorage is empty', async () => {
    const stats = await botPersistence.getStorageStats();
    assert.deepStrictEqual(stats, {
      totalStates: 0,
      storageSize: 0,
      oldestState: null,
      newestState: null,
    });
  });

  it('should return 0 stats on internal exception', async () => {
    // Force getItem to throw
    (global as any).localStorage.getItem = mock.fn(() => {
      throw new Error('getItem failed');
    });

    const stats = await botPersistence.getStorageStats();
    assert.deepStrictEqual(stats, {
      totalStates: 0,
      storageSize: 0,
      oldestState: null,
      newestState: null,
    });
  });
});

setTimeout(() => {
  process.exit(0);
}, 200).unref();
