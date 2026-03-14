import test from 'node:test';
import assert from 'node:assert';
import { BotPersistence, botPersistence } from './bot-persistence';
import { logger } from './logger';

test.after(() => {
  botPersistence.destroy();
  process.exit(0);
});

test('BotPersistence - loadState', async (t) => {
  // Setup global mocks
  const originalWindow = (global as any).window;
  const originalLocalStorage = (global as any).localStorage;

  const mockStorage: Record<string, string> = {};

  (global as any).window = {};
  (global as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; }
  };

  t.after(() => {
    (global as any).window = originalWindow;
    (global as any).localStorage = originalLocalStorage;
  });

  await t.test('returns null if botId is not found in stored states', async () => {
    mockStorage['trading-bot-state'] = JSON.stringify({
      'other-bot-id': { botId: 'other-bot-id', status: 'idle', lastActivity: 123 }
    });

    const bp = new BotPersistence({ autoSaveInterval: 100000, compressionEnabled: false });
    const result = await bp.loadState('target-bot-id');

    assert.strictEqual(result, null);
    bp.destroy();
  });

  await t.test('returns parsed state if botId exists', async () => {
    const expectedState = {
      botId: 'target-bot-id',
      status: 'running',
      lastActivity: 123456789,
      config: { id: 'config-1' }
    };

    mockStorage['trading-bot-state'] = JSON.stringify({
      'target-bot-id': expectedState
    });

    const bp = new BotPersistence({ autoSaveInterval: 100000, compressionEnabled: false });
    const result = await bp.loadState('target-bot-id');

    assert.deepStrictEqual(result, expectedState);
    bp.destroy();
  });

  await t.test('handles invalid JSON gracefully and returns null', async () => {
    mockStorage['trading-bot-state'] = 'invalid-json';

    const bp = new BotPersistence({ autoSaveInterval: 100000, compressionEnabled: false });
    const result = await bp.loadState('target-bot-id');

    assert.strictEqual(result, null);
    bp.destroy();
  });

  await t.test('handles compressed data gracefully', async () => {
    const expectedState = {
      botId: 'target-bot-id',
      status: 'idle',
      lastActivity: 123456789,
      config: { id: 'config-1' }
    };

    const jsonData = JSON.stringify({ 'target-bot-id': expectedState });
    const compressedData = btoa(jsonData); // Simple compression as implemented in BotPersistence
    mockStorage['trading-bot-state'] = `compressed:${compressedData}`;

    const bp = new BotPersistence({ autoSaveInterval: 100000, compressionEnabled: true });
    const result = await bp.loadState('target-bot-id');

    assert.deepStrictEqual(result, expectedState);
    bp.destroy();
  });
});
