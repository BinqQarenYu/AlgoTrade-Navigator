'use client';

import type { LiveBotStateForAsset, LiveBotConfig, TradeSignal } from './types';
import { logger } from './logger';

/**
 * Bot state persistence and recovery system
 */

export interface PersistedBotState {
  botId: string;
  config: LiveBotConfig & { id: string };
  activePosition: TradeSignal | null;
  status: LiveBotStateForAsset['status'];
  lastActivity: number;
  consecutiveLosses: number;
  sessionPnl: number;
  cooldownUntil: number | null;
  riskGuardianState: any;
  websocketConfig: {
    reconnectAttempts: number;
    lastConnectionTime: number;
  };
}

export interface BotPersistenceConfig {
  storageKey: string;
  autoSaveInterval: number;
  maxStateHistory: number;
  compressionEnabled: boolean;
}

export class BotPersistence {
  private config: BotPersistenceConfig;
  private autoSaveTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<BotPersistenceConfig>) {
    this.config = {
      storageKey: 'trading-bot-state',
      autoSaveInterval: 30000, // 30 seconds
      maxStateHistory: 10,
      compressionEnabled: true,
      ...config
    };

    this.startAutoSave();
  }

  /**
   * Save bot state to localStorage with compression and error handling
   */
  public async saveState(botId: string, state: LiveBotStateForAsset): Promise<boolean> {
    try {
      const persistedState: PersistedBotState = {
        botId,
        config: state.config,
        activePosition: state.activePosition,
        status: state.status,
        lastActivity: Date.now(),
        consecutiveLosses: 0, // This should come from RiskGuardian
        sessionPnl: 0, // This should come from RiskGuardian
        cooldownUntil: null, // This should come from RiskGuardian
        riskGuardianState: null, // Placeholder for RiskGuardian state
        websocketConfig: {
          reconnectAttempts: 0,
          lastConnectionTime: Date.now(),
        }
      };

      const allStates = await this.loadAllStates();
      allStates[botId] = persistedState;

      // Keep only the most recent states
      const stateEntries = Object.entries(allStates);
      if (stateEntries.length > this.config.maxStateHistory) {
        const sortedStates = stateEntries
          .sort(([, a], [, b]) => b.lastActivity - a.lastActivity)
          .slice(0, this.config.maxStateHistory);
        
        const trimmedStates: Record<string, PersistedBotState> = {};
        sortedStates.forEach(([id, state]) => {
          trimmedStates[id] = state;
        });
        
        await this.saveAllStates(trimmedStates);
      } else {
        await this.saveAllStates(allStates);
      }

      logger.debug(
        `Bot state saved successfully`,
        { botId, status: state.status, hasPosition: !!state.activePosition },
        botId,
        'persistence'
      );

      return true;
    } catch (error: any) {
      logger.error(
        `Failed to save bot state: ${error.message}`,
        { botId, error: error.message },
        botId,
        'persistence'
      );
      return false;
    }
  }

  /**
   * Load bot state from localStorage
   */
  public async loadState(botId: string): Promise<PersistedBotState | null> {
    try {
      const allStates = await this.loadAllStates();
      const state = allStates[botId];

      if (state) {
        logger.debug(
          `Bot state loaded successfully`,
          { botId, status: state.status, hasPosition: !!state.activePosition },
          botId,
          'persistence'
        );
        return state;
      }

      return null;
    } catch (error: any) {
      logger.error(
        `Failed to load bot state: ${error.message}`,
        { botId, error: error.message },
        botId,
        'persistence'
      );
      return null;
    }
  }

  /**
   * Load all bot states
   */
  public async loadAllStates(): Promise<Record<string, PersistedBotState>> {
    try {
      if (typeof window === 'undefined') return {};

      const storedData = localStorage.getItem(this.config.storageKey);
      if (!storedData) return {};

      let parsedData: any;
      
      if (this.config.compressionEnabled && storedData.startsWith('compressed:')) {
        // Simple compression implementation (could be improved with actual compression library)
        const compressedData = storedData.slice(11);
        const decompressedData = atob(compressedData);
        parsedData = JSON.parse(decompressedData);
      } else {
        parsedData = JSON.parse(storedData);
      }

      // Validate and migrate old data format if necessary
      return this.validateAndMigrateData(parsedData);
    } catch (error: any) {
      logger.error(
        `Failed to load all bot states: ${error.message}`,
        { error: error.message },
        undefined,
        'persistence'
      );
      return {};
    }
  }

  /**
   * Save all bot states
   */
  private async saveAllStates(states: Record<string, PersistedBotState>): Promise<void> {
    try {
      if (typeof window === 'undefined') return;

      let dataToStore: string;
      const jsonData = JSON.stringify(states);

      if (this.config.compressionEnabled) {
        // Simple compression implementation
        const compressedData = btoa(jsonData);
        dataToStore = `compressed:${compressedData}`;
      } else {
        dataToStore = jsonData;
      }

      localStorage.setItem(this.config.storageKey, dataToStore);
    } catch (error: any) {
      logger.error(
        `Failed to save all bot states: ${error.message}`,
        { error: error.message },
        undefined,
        'persistence'
      );
      throw error;
    }
  }

  /**
   * Delete a bot's persisted state
   */
  public async deleteState(botId: string): Promise<boolean> {
    try {
      const allStates = await this.loadAllStates();
      delete allStates[botId];
      await this.saveAllStates(allStates);

      logger.info(
        `Bot state deleted successfully`,
        { botId },
        botId,
        'persistence'
      );

      return true;
    } catch (error: any) {
      logger.error(
        `Failed to delete bot state: ${error.message}`,
        { botId, error: error.message },
        botId,
        'persistence'
      );
      return false;
    }
  }

  /**
   * Check if a bot has persisted state
   */
  public async hasState(botId: string): Promise<boolean> {
    const state = await this.loadState(botId);
    return state !== null;
  }

  /**
   * Get all bot IDs with persisted states
   */
  public async getAllBotIds(): Promise<string[]> {
    const allStates = await this.loadAllStates();
    return Object.keys(allStates);
  }

  /**
   * Clear all persisted states
   */
  public async clearAllStates(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') return false;
      
      localStorage.removeItem(this.config.storageKey);
      
      logger.info(
        `All bot states cleared successfully`,
        {},
        undefined,
        'persistence'
      );

      return true;
    } catch (error: any) {
      logger.error(
        `Failed to clear all bot states: ${error.message}`,
        { error: error.message },
        undefined,
        'persistence'
      );
      return false;
    }
  }

  /**
   * Get storage usage statistics
   */
  public async getStorageStats(): Promise<{
    totalStates: number;
    storageSize: number;
    oldestState: number | null;
    newestState: number | null;
  }> {
    try {
      const allStates = await this.loadAllStates();
      const states = Object.values(allStates);

      if (typeof window === 'undefined') {
        return { totalStates: 0, storageSize: 0, oldestState: null, newestState: null };
      }

      const storedData = localStorage.getItem(this.config.storageKey) || '';
      const storageSize = new Blob([storedData]).size;

      const timestamps = states.map(state => state.lastActivity);
      
      return {
        totalStates: states.length,
        storageSize,
        oldestState: timestamps.length > 0 ? Math.min(...timestamps) : null,
        newestState: timestamps.length > 0 ? Math.max(...timestamps) : null,
      };
    } catch (error: any) {
      logger.error(
        `Failed to get storage stats: ${error.message}`,
        { error: error.message },
        undefined,
        'persistence'
      );
      return { totalStates: 0, storageSize: 0, oldestState: null, newestState: null };
    }
  }

  /**
   * Auto-save functionality
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      this.performMaintenanceTasks();
    }, this.config.autoSaveInterval);
  }

  /**
   * Perform maintenance tasks like cleaning old states
   */
  private async performMaintenanceTasks(): Promise<void> {
    try {
      const allStates = await this.loadAllStates();
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      
      let cleanedCount = 0;
      const activeStates: Record<string, PersistedBotState> = {};

      for (const [botId, state] of Object.entries(allStates)) {
        // Keep active bots or recently active bots
        if (state.status !== 'idle' && state.status !== 'error' || state.lastActivity > cutoffTime) {
          activeStates[botId] = state;
        } else {
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        await this.saveAllStates(activeStates);
        logger.debug(
          `Cleaned up ${cleanedCount} inactive bot states`,
          { cleanedCount },
          undefined,
          'persistence'
        );
      }
    } catch (error: any) {
      logger.error(
        `Maintenance task failed: ${error.message}`,
        { error: error.message },
        undefined,
        'persistence'
      );
    }
  }

  /**
   * Validate and migrate data from older versions
   */
  private validateAndMigrateData(data: any): Record<string, PersistedBotState> {
    if (!data || typeof data !== 'object') {
      return {};
    }

    const migratedData: Record<string, PersistedBotState> = {};

    for (const [botId, state] of Object.entries(data)) {
      try {
        if (this.isValidPersistedState(state)) {
          migratedData[botId] = state as PersistedBotState;
        } else {
          // Attempt to migrate from older format
          const migratedState = this.migrateOldState(botId, state);
          if (migratedState) {
            migratedData[botId] = migratedState;
          }
        }
      } catch (error) {
        logger.warn(
          `Failed to validate/migrate state for bot ${botId}`,
          { error: error },
          botId,
          'persistence'
        );
      }
    }

    return migratedData;
  }

  /**
   * Check if state object has valid structure
   */
  private isValidPersistedState(state: any): boolean {
    return (
      state &&
      typeof state === 'object' &&
      typeof state.botId === 'string' &&
      state.config &&
      typeof state.config === 'object' &&
      typeof state.lastActivity === 'number' &&
      ['idle', 'running', 'analyzing', 'position_open', 'error', 'cooldown'].includes(state.status)
    );
  }

  /**
   * Migrate old state format to new format
   */
  private migrateOldState(botId: string, oldState: any): PersistedBotState | null {
    try {
      // Implement migration logic for older formats
      if (oldState && oldState.config) {
        return {
          botId,
          config: oldState.config,
          activePosition: oldState.activePosition || null,
          status: oldState.status || 'idle',
          lastActivity: oldState.lastActivity || Date.now(),
          consecutiveLosses: 0,
          sessionPnl: 0,
          cooldownUntil: null,
          riskGuardianState: null,
          websocketConfig: {
            reconnectAttempts: 0,
            lastConnectionTime: Date.now(),
          }
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  public destroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }
}

// Export singleton instance
export const botPersistence = new BotPersistence();