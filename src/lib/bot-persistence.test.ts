import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { BotPersistence } from './bot-persistence';
import type { LiveBotStateForAsset } from './types';

// Simple base64 polyfill for node since btoa/atob are on global in modern node, but let's be safe
if (typeof global.btoa === 'undefined') {
  global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}
if (typeof global.atob === 'undefined') {
  global.atob = (b64Encoded) => Buffer.from(b64Encoded, 'base64').toString('binary');
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

describe('BotPersistence - saveState', () => {
  let persistence: BotPersistence;
  const STORAGE_KEY = 'test-trading-bot-state';
  let originalWindow: any;
  let activeTimers: any[] = [];
  let originalSetInterval: any;

  beforeEach(() => {
    // Reset mock
    localStorageMock.clear();

    // Mock global window object to bypass `typeof window === 'undefined'` check
    originalWindow = global.window;
    (global as any).window = {};

    // Mock global localStorage
    (global as any).localStorage = localStorageMock;

    originalSetInterval = global.setInterval;
    (global as any).setInterval = (callback: any, ms: any) => {
        const timer = originalSetInterval(callback, ms);
        activeTimers.push(timer);
        return timer;
    }

    // Initialize BotPersistence instance
    persistence = new BotPersistence({
      storageKey: STORAGE_KEY,
      autoSaveInterval: 10000,
      maxStateHistory: 3, // Smaller limit for easier testing
      compressionEnabled: false, // Start with false for easier inspection, test true later
    });
  });

  afterEach(() => {
    persistence.destroy();

    if (originalWindow === undefined) {
      delete (global as any).window;
    } else {
      (global as any).window = originalWindow;
    }
    delete (global as any).localStorage;

    (global as any).setInterval = originalSetInterval;

    // Clear ALL intervals created during the test to avoid hanging the test runner
    activeTimers.forEach(timer => clearInterval(timer));
    activeTimers = [];
  });

  const createMockState = (status: LiveBotStateForAsset['status'] = 'running'): LiveBotStateForAsset => ({
    status,
    config: {
      id: 'config-1',
      asset: 'BTC',
      baseCurrency: 'USDT',
      tradeAmount: 100,
      leverage: 1,
      strategy: 'MACD',
      interval: '1m',
      takeProfit: 1.5,
      stopLoss: 0.5,
    },
    activePosition: null,
    chartData: [],
    logs: [],
  });

  test('successfully saves a valid bot state', async () => {
    const botId = 'bot-1';
    const mockState = createMockState();

    const result = await persistence.saveState(botId, mockState);

    assert.strictEqual(result, true);

    const storedData = localStorageMock.getItem(STORAGE_KEY);
    assert.ok(storedData);

    const parsedData = JSON.parse(storedData);
    assert.ok(parsedData[botId]);
    assert.strictEqual(parsedData[botId].botId, botId);
    assert.strictEqual(parsedData[botId].status, 'running');
    assert.strictEqual(parsedData[botId].activePosition, null);
    assert.ok(typeof parsedData[botId].lastActivity === 'number');
  });

  test('handles errors during save gracefully and returns false', async () => {
    const botId = 'bot-error';
    const mockState = createMockState();

    // Force an error by mocking localStorage.setItem to throw
    const originalSetItem = localStorageMock.setItem;
    localStorageMock.setItem = () => {
      throw new Error('Quota exceeded');
    };

    try {
      const result = await persistence.saveState(botId, mockState);
      assert.strictEqual(result, false);
    } finally {
      // Restore
      localStorageMock.setItem = originalSetItem;
    }
  });

  test('trims history to maxStateHistory limit', async () => {
    // We set maxStateHistory to 3 in beforeEach
    const mockState = createMockState();

    // Save 4 different bots (more than max limit of 3)
    // We add an artificial delay or manually modify lastActivity to ensure consistent sorting
    // But since the code uses Date.now(), we'll mock Date.now temporarily
    const originalDateNow = Date.now;

    let time = 1000;
    Date.now = () => time++;

    try {
      await persistence.saveState('bot-oldest', mockState);
      await persistence.saveState('bot-middle1', mockState);
      await persistence.saveState('bot-middle2', mockState);
      await persistence.saveState('bot-newest', mockState);

      const storedData = localStorageMock.getItem(STORAGE_KEY);
      assert.ok(storedData);

      const parsedData = JSON.parse(storedData);
      const keys = Object.keys(parsedData);

      assert.strictEqual(keys.length, 3);

      // 'bot-oldest' should be removed because it has the smallest timestamp
      assert.strictEqual(keys.includes('bot-oldest'), false);
      assert.strictEqual(keys.includes('bot-middle1'), true);
      assert.strictEqual(keys.includes('bot-middle2'), true);
      assert.strictEqual(keys.includes('bot-newest'), true);
    } finally {
      Date.now = originalDateNow;
    }
  });

  test('successfully saves state with compression enabled', async () => {
    const compressedPersistence = new BotPersistence({
      storageKey: 'compressed-key',
      compressionEnabled: true,
    });

    try {
      const botId = 'bot-compressed';
      const mockState = createMockState();

      const result = await compressedPersistence.saveState(botId, mockState);
      assert.strictEqual(result, true);

      const storedData = localStorageMock.getItem('compressed-key');
      assert.ok(storedData);

      // Should start with the prefix
      assert.strictEqual(storedData.startsWith('compressed:'), true);

      // We can also verify it loads correctly
      const loadedState = await compressedPersistence.loadState(botId);
      assert.ok(loadedState);
      assert.strictEqual(loadedState.botId, botId);
      assert.strictEqual(loadedState.status, 'running');
    } finally {
      compressedPersistence.destroy();
    }
  });

});

// To fix Node test runner hanging due to dangling intervals from Singletons (logger.ts)
// we manually forcefully exit after all tests in this file complete.
import { after } from 'node:test';
after(() => {
    setTimeout(() => process.exit(0), 10).unref();
});
