import { describe, it, expect, vi } from 'vitest';
import { BotPersistence } from '../bot-persistence';
import { logger } from '../logger';

describe('BotPersistence', () => {
  describe('loadState', () => {
    it('should return null and log error when loading state fails', async () => {
      // Setup
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

      let botPersistence: BotPersistence | null = null;
      try {
        botPersistence = new BotPersistence();

        // Mock loadAllStates to throw an error
        vi.spyOn(botPersistence, 'loadAllStates').mockRejectedValue(new Error('Simulated load error'));

        const result = await botPersistence.loadState('test-bot-id');

        expect(result).toBeNull();
        expect(errorSpy).toHaveBeenCalled();

      } finally {
        if (botPersistence) {
          botPersistence.destroy();
        }
        // Restore logger
        errorSpy.mockRestore();
        vi.restoreAllMocks();
      }
    });
  });
});
