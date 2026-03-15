import test, { describe, it, beforeEach, afterEach, before, after } from 'node:test';
import assert from 'node:assert';

describe('BotPersistence - getAllBotIds', async () => {
  let BotPersistence: any;
  let singletonBotPersistence: any;

  before(async () => {
    // Mock timers before importing the module to prevent setInterval from keeping the process alive
    const originalSetInterval = global.setInterval;
    global.setInterval = ((callback: any, ms?: number) => {
      const timer = originalSetInterval(callback, ms);
      if (timer && typeof timer.unref === 'function') {
        timer.unref();
      }
      return timer;
    }) as any;

    const module = await import('./bot-persistence');
    BotPersistence = module.BotPersistence;
    singletonBotPersistence = module.botPersistence;

    global.setInterval = originalSetInterval;
  });

  let botPersistence: any;
  let originalWindow: any;
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    // Setup mock window and localStorage
    originalWindow = global.window;

    mockStorage = {};
    const localStorageMock = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => { mockStorage[key] = value.toString(); },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; }
    };

    (global as any).window = {};
    (global as any).localStorage = localStorageMock;

    // We disable compression for easier testing, though the method under test just calls loadAllStates
    botPersistence = new BotPersistence({
      compressionEnabled: false,
    });
  });

  afterEach(() => {
    // Cleanup
    if (botPersistence) {
      botPersistence.destroy();
    }
    (global as any).window = originalWindow;
    delete (global as any).localStorage;
  });

  after(() => {
    if (singletonBotPersistence) {
      singletonBotPersistence.destroy();
    }
  });

  it('should return an empty array when no states are stored', async () => {
    const ids = await botPersistence.getAllBotIds();
    assert.deepStrictEqual(ids, []);
  });

  it('should return bot IDs correctly when states exist in uncompressed format', async () => {
    // Mock valid uncompressed data
    const mockData = {
      'bot-123': {
        botId: 'bot-123',
        config: { id: 'config-1' },
        activePosition: null,
        status: 'running',
        lastActivity: Date.now()
      },
      'bot-456': {
        botId: 'bot-456',
        config: { id: 'config-2' },
        activePosition: null,
        status: 'idle',
        lastActivity: Date.now()
      }
    };

    mockStorage['trading-bot-state'] = JSON.stringify(mockData);

    const ids = await botPersistence.getAllBotIds();

    assert.strictEqual(ids.length, 2);
    assert.ok(ids.includes('bot-123'));
    assert.ok(ids.includes('bot-456'));
  });

  it('should return bot IDs correctly when states exist in compressed format', async () => {
    // Instantiate with compression enabled
    const compressedPersistence = new BotPersistence({
      compressionEnabled: true
    });

    const mockData = {
      'bot-789': {
        botId: 'bot-789',
        config: { id: 'config-3' },
        activePosition: null,
        status: 'analyzing',
        lastActivity: Date.now()
      }
    };

    // We mock the save behavior indirectly to get compressed data
    const jsonData = JSON.stringify(mockData);
    const compressedData = btoa(jsonData);
    mockStorage['trading-bot-state'] = `compressed:${compressedData}`;

    const ids = await compressedPersistence.getAllBotIds();

    assert.strictEqual(ids.length, 1);
    assert.strictEqual(ids[0], 'bot-789');

    compressedPersistence.destroy();
  });
});
