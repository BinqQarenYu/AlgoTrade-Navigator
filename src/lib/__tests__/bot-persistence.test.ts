import { describe, it, beforeEach, afterEach, after } from 'node:test';
import assert from 'node:assert';
import { BotPersistence } from '../bot-persistence';
import { logger } from '../logger';

// Many singleton classes in this app use setInterval for maintenance/ping tasks.
// To prevent the test runner from hanging indefinitely, we intercept these
// intervals and forcefully clear them at the end of the test.
const originalSetInterval = global.setInterval;
const intervals: NodeJS.Timeout[] = [];
(global as any).setInterval = (...args: any[]) => {
  const id = originalSetInterval(args[0], args[1], ...args.slice(2));
  intervals.push(id as any);
  return id;
};

// Also clear timeout just in case
const originalSetTimeout = global.setTimeout;
const timeouts: NodeJS.Timeout[] = [];
(global as any).setTimeout = (...args: any[]) => {
  const id = originalSetTimeout(args[0], args[1], ...args.slice(2));
  timeouts.push(id as any);
  return id;
};

after(() => {
  intervals.forEach(id => clearInterval(id));
  timeouts.forEach(id => clearTimeout(id));
  // Explicitly exit process if it still hangs after a timeout
  setTimeout(() => process.exit(0), 100);
});

describe('BotPersistence', () => {
  let originalLocalStorage: any;
  let originalWindow: any;
  let originalBtoa: any;
  let originalAtob: any;
  let originalLoggerError: any;

  beforeEach(() => {
    // Save original global objects
    originalLocalStorage = global.localStorage;
    originalWindow = (global as any).window;
    originalBtoa = global.btoa;
    originalAtob = global.atob;
    originalLoggerError = logger.error;

    // Mock window to pass the "if (typeof window === 'undefined')" check
    (global as any).window = {};

    // Provide btoa/atob for the Node environment
    global.btoa = (str: string) => Buffer.from(str).toString('base64');
    global.atob = (str: string) => Buffer.from(str, 'base64').toString();

    // Setup basic mock for localStorage
    (global as any).localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      length: 0,
      key: () => null,
    };
  });

  afterEach(() => {
    // Restore original global objects
    (global as any).localStorage = originalLocalStorage;
    (global as any).window = originalWindow;
    global.btoa = originalBtoa;
    global.atob = originalAtob;
    logger.error = originalLoggerError;
  });

  describe('saveState', () => {
    it('should return false and log an error when saving fails', async () => {
      const errorMessage = 'Storage quota exceeded';

      // Mock localStorage.setItem to throw an error
      (global as any).localStorage.setItem = () => {
        throw new Error(errorMessage);
      };

      // Spy on logger.error
      let loggedErrorCallCount = 0;
      let loggedErrorMessage = '';

      logger.error = (msg: string) => {
        loggedErrorCallCount++;
        // We capture the last error message or concatenate them to check for the specific one
        loggedErrorMessage += msg + ' | ';
      };

      const persistence = new BotPersistence();

      // Create a dummy state object
      const mockState: any = {
        config: { id: 'test-bot', someConfig: true },
        activePosition: null,
        status: 'running',
      };

      const result = await persistence.saveState('test-bot', mockState);

      // Assertions
      assert.strictEqual(result, false, 'saveState should return false when an error occurs');
      // It might be called more than once (e.g. once in saveAllStates and once in saveState)
      assert.ok(loggedErrorCallCount >= 1, 'logger.error should be called at least once');
      assert.ok(
        loggedErrorMessage.includes(`Failed to save bot state: ${errorMessage}`),
        `Expected error message to include 'Failed to save bot state: ${errorMessage}', but got '${loggedErrorMessage}'`
      );

      persistence.destroy();
    });
  });
});
