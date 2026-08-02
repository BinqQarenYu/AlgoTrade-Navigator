import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { BotPersistence } from '../bot-persistence';
import { logger } from '../logger';

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
      expect(result).toBe(false);
      expect(loggedErrorCallCount).toBeGreaterThanOrEqual(1);
      expect(loggedErrorMessage).toContain(`Failed to save bot state: ${errorMessage}`);

      persistence.destroy();
    });
  });
});
