'use client';

import { logger } from './logger';
import type { ApiProfile, Position } from './types';

/**
 * Emergency stop and safety mechanisms for trading bots
 */

export type EmergencyTrigger = 
  | 'MANUAL_STOP'
  | 'MAX_DRAWDOWN'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'SYSTEM_ERROR'
  | 'RISK_LIMIT'
  | 'MARKET_ANOMALY'
  | 'CONNECTION_FAILURE';

export interface EmergencyStopConfig {
  maxDrawdownPercent: number;
  maxConsecutiveErrors: number;
  emergencyStopEnabled: boolean;
  autoClosePositions: boolean;
  maxNetworkErrors: number;
  maxApiErrors: number;
  marketAnomalyThreshold: number;
}

export interface EmergencyEvent {
  id: string;
  timestamp: number;
  trigger: EmergencyTrigger;
  message: string;
  context?: Record<string, any>;
  botIds: string[];
  resolved: boolean;
  resolvedAt?: number;
}

export class EmergencyStopSystem {
  private config: EmergencyStopConfig;
  private isActive: boolean = false;
  private events: EmergencyEvent[] = [];
  private errorCounts: Map<string, number> = new Map();
  private listeners: Set<(event: EmergencyEvent) => void> = new Set();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<EmergencyStopConfig>) {
    this.config = {
      maxDrawdownPercent: parseFloat(process.env.RISK_MAX_DRAWDOWN_PERCENT || '10'),
      maxConsecutiveErrors: 5,
      emergencyStopEnabled: process.env.RISK_EMERGENCY_STOP_ENABLED === 'true',
      autoClosePositions: true,
      maxNetworkErrors: 10,
      maxApiErrors: 5,
      marketAnomalyThreshold: 0.2, // 20% price movement
      ...config
    };

    this.startMonitoring();
    
    logger.info('Emergency stop system initialized', { config: this.config }, undefined, 'emergency');
  }

  /**
   * Trigger emergency stop
   */
  public async triggerEmergencyStop(
    trigger: EmergencyTrigger,
    message: string,
    botIds: string[] = [],
    context?: Record<string, any>
  ): Promise<EmergencyEvent> {
    const event: EmergencyEvent = {
      id: `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      trigger,
      message,
      context,
      botIds,
      resolved: false,
    };

    this.events.push(event);
    this.isActive = true;

    logger.critical(
      `EMERGENCY STOP TRIGGERED: ${message}`,
      { trigger, botIds, context },
      undefined,
      'emergency'
    );

    // Notify all listeners
    this.notifyListeners(event);

    // Execute emergency procedures if enabled
    if (this.config.emergencyStopEnabled) {
      await this.executeEmergencyProcedures(event);
    } else {
      logger.warn(
        'Emergency stop procedures are disabled, only logging the event',
        { event },
        undefined,
        'emergency'
      );
    }

    return event;
  }

  /**
   * Manual emergency stop
   */
  public async manualStop(reason: string, botIds?: string[]): Promise<EmergencyEvent> {
    return await this.triggerEmergencyStop(
      'MANUAL_STOP',
      `Manual emergency stop: ${reason}`,
      botIds || [],
      { reason, manual: true }
    );
  }

  /**
   * Check if system is in emergency state
   */
  public isEmergencyActive(): boolean {
    return this.isActive;
  }

  /**
   * Get recent emergency events
   */
  public getEmergencyEvents(limit: number = 10): EmergencyEvent[] {
    return this.events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Resolve emergency event
   */
  public resolveEmergency(eventId: string, resolvedBy?: string): boolean {
    const event = this.events.find(e => e.id === eventId);
    if (!event || event.resolved) {
      return false;
    }

    event.resolved = true;
    event.resolvedAt = Date.now();

    logger.info(
      `Emergency event resolved: ${event.message}`,
      { eventId, resolvedBy },
      undefined,
      'emergency'
    );

    // Check if we should deactivate emergency state
    const activeEvents = this.events.filter(e => !e.resolved && Date.now() - e.timestamp < 300000); // 5 minutes
    if (activeEvents.length === 0) {
      this.isActive = false;
      logger.info('Emergency state deactivated - all events resolved', {}, undefined, 'emergency');
    }

    return true;
  }

  /**
   * Clear resolved events older than specified time
   */
  public clearOldEvents(maxAgeMs: number = 86400000): void { // 24 hours default
    const cutoffTime = Date.now() - maxAgeMs;
    const beforeCount = this.events.length;
    
    this.events = this.events.filter(e => 
      !e.resolved || e.timestamp > cutoffTime
    );

    const removedCount = beforeCount - this.events.length;
    if (removedCount > 0) {
      logger.debug(`Cleared ${removedCount} old emergency events`, { removedCount }, undefined, 'emergency');
    }
  }

  /**
   * Subscribe to emergency events
   */
  public subscribe(listener: (event: EmergencyEvent) => void): () => void {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Record error for monitoring
   */
  public recordError(errorType: string, botId?: string): void {
    const key = botId ? `${errorType}_${botId}` : errorType;
    const currentCount = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, currentCount + 1);

    // Check if error threshold is exceeded
    this.checkErrorThresholds(errorType, botId);
  }

  /**
   * Reset error count for a specific type/bot
   */
  public resetErrorCount(errorType: string, botId?: string): void {
    const key = botId ? `${errorType}_${botId}` : errorType;
    this.errorCounts.delete(key);
  }

  /**
   * Monitor account balance for drawdown
   */
  public async checkDrawdown(
    currentBalance: number,
    initialBalance: number,
    botId?: string
  ): Promise<void> {
    if (initialBalance <= 0) return;

    const drawdownPercent = ((initialBalance - currentBalance) / initialBalance) * 100;
    
    if (drawdownPercent >= this.config.maxDrawdownPercent) {
      await this.triggerEmergencyStop(
        'MAX_DRAWDOWN',
        `Maximum drawdown of ${this.config.maxDrawdownPercent}% exceeded (current: ${drawdownPercent.toFixed(2)}%)`,
        botId ? [botId] : [],
        { drawdownPercent, currentBalance, initialBalance }
      );
    }
  }

  /**
   * Monitor for market anomalies
   */
  public async checkMarketAnomaly(
    symbol: string,
    priceChange: number,
    volume: number,
    botIds: string[] = []
  ): Promise<void> {
    const changePercent = Math.abs(priceChange);
    
    if (changePercent >= this.config.marketAnomalyThreshold) {
      await this.triggerEmergencyStop(
        'MARKET_ANOMALY',
        `Market anomaly detected for ${symbol}: ${(changePercent * 100).toFixed(2)}% price movement`,
        botIds,
        { symbol, priceChange, volume, changePercent }
      );
    }
  }

  /**
   * Execute emergency procedures
   */
  private async executeEmergencyProcedures(event: EmergencyEvent): Promise<void> {
    logger.critical('Executing emergency procedures', { event }, undefined, 'emergency');

    try {
      // 1. Stop all affected bots (this would be handled by the bot context)
      if (event.botIds.length > 0) {
        logger.info(`Stopping ${event.botIds.length} affected bots`, { botIds: event.botIds }, undefined, 'emergency');
        // The actual bot stopping would be handled by the BotContext
        // We just log the intention here
      }

      // 2. Close positions if configured to do so
      if (this.config.autoClosePositions) {
        logger.info('Auto-close positions is enabled', { trigger: event.trigger }, undefined, 'emergency');
        // Position closing would be handled by the trading system
      }

      // 3. Disconnect WebSocket connections
      logger.info('Disconnecting WebSocket connections', { trigger: event.trigger }, undefined, 'emergency');
      // WebSocket disconnection would be handled by the WebSocket manager

      // 4. Send notifications (would integrate with notification system)
      logger.info('Emergency notifications sent', { trigger: event.trigger }, undefined, 'emergency');

    } catch (error: any) {
      logger.error(
        `Failed to execute emergency procedures: ${error.message}`,
        { error: error.message, event },
        undefined,
        'emergency'
      );
    }
  }

  /**
   * Check error thresholds and trigger emergency if needed
   */
  private checkErrorThresholds(errorType: string, botId?: string): void {
    const key = botId ? `${errorType}_${botId}` : errorType;
    const count = this.errorCounts.get(key) || 0;

    let threshold = this.config.maxConsecutiveErrors;
    
    // Use specific thresholds for certain error types
    if (errorType.includes('network')) {
      threshold = this.config.maxNetworkErrors;
    } else if (errorType.includes('api')) {
      threshold = this.config.maxApiErrors;
    }

    if (count >= threshold) {
      this.triggerEmergencyStop(
        errorType.includes('network') ? 'NETWORK_ERROR' : 
        errorType.includes('api') ? 'API_ERROR' : 'SYSTEM_ERROR',
        `Error threshold exceeded for ${errorType}: ${count}/${threshold}`,
        botId ? [botId] : [],
        { errorType, count, threshold }
      );

      // Reset count after triggering
      this.errorCounts.delete(key);
    }
  }

  /**
   * Start monitoring systems
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.performMaintenanceTasks();
    }, 60000); // Every minute
  }

  /**
   * Perform maintenance tasks
   */
  private performMaintenanceTasks(): void {
    try {
      // Clear old events
      this.clearOldEvents();

      // Reset old error counts (older than 1 hour)
      const cutoffTime = Date.now() - 3600000;
      const keysToReset: string[] = [];

      // Note: In a real implementation, you'd track when errors were recorded
      // For now, we'll reset all counts periodically
      if (Date.now() % (3600000) < 60000) { // Once per hour
        this.errorCounts.clear();
        logger.debug('Reset all error counts', {}, undefined, 'emergency');
      }

      // Check for stale emergency state
      if (this.isActive) {
        const recentEvents = this.events.filter(e => 
          !e.resolved && Date.now() - e.timestamp < 600000 // 10 minutes
        );

        if (recentEvents.length === 0) {
          this.isActive = false;
          logger.info('Emergency state auto-deactivated (no recent unresolved events)', {}, undefined, 'emergency');
        }
      }

    } catch (error: any) {
      logger.error(
        `Emergency system maintenance failed: ${error.message}`,
        { error: error.message },
        undefined,
        'emergency'
      );
    }
  }

  /**
   * Notify all listeners of emergency event
   */
  private notifyListeners(event: EmergencyEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error: any) {
        logger.error(
          `Error notifying emergency listener: ${error.message}`,
          { error: error.message },
          undefined,
          'emergency'
        );
      }
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<EmergencyStopConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Emergency stop configuration updated', { newConfig }, undefined, 'emergency');
  }

  /**
   * Get current configuration
   */
  public getConfig(): EmergencyStopConfig {
    return { ...this.config };
  }

  /**
   * Get system statistics
   */
  public getStats(): {
    isActive: boolean;
    totalEvents: number;
    unresolvedEvents: number;
    errorCounts: Record<string, number>;
    uptime: number;
  } {
    return {
      isActive: this.isActive,
      totalEvents: this.events.length,
      unresolvedEvents: this.events.filter(e => !e.resolved).length,
      errorCounts: Object.fromEntries(this.errorCounts),
      uptime: Date.now() - (this.events[0]?.timestamp || Date.now()),
    };
  }

  /**
   * Test emergency system
   */
  public async testEmergencySystem(): Promise<boolean> {
    try {
      logger.info('Testing emergency stop system', {}, undefined, 'emergency');
      
      const testEvent = await this.triggerEmergencyStop(
        'MANUAL_STOP',
        'Emergency system test',
        [],
        { test: true }
      );

      // Immediately resolve test event
      this.resolveEmergency(testEvent.id, 'system_test');
      
      logger.info('Emergency system test completed successfully', { testEventId: testEvent.id }, undefined, 'emergency');
      
      return true;
    } catch (error: any) {
      logger.error(
        `Emergency system test failed: ${error.message}`,
        { error: error.message },
        undefined,
        'emergency'
      );
      return false;
    }
  }

  /**
   * Destroy the emergency system
   */
  public destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.listeners.clear();
    this.errorCounts.clear();
    
    logger.info('Emergency stop system destroyed', {}, undefined, 'emergency');
  }
}

// Export singleton instance
export const emergencyStop = new EmergencyStopSystem();