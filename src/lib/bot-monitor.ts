'use client';

import { logger } from './logger';
import { emergencyStop } from './emergency-stop';
import type { LiveBotStateForAsset, TradeSignal } from './types';

/**
 * Bot monitoring and health check system
 */

export type BotHealthStatus = 'healthy' | 'warning' | 'critical' | 'offline';

export interface BotHealthMetrics {
  botId: string;
  status: BotHealthStatus;
  lastUpdate: number;
  uptime: number;
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  winRate: number;
  currentPnl: number;
  maxDrawdown: number;
  avgExecutionTime: number;
  websocketStatus: 'connected' | 'disconnected' | 'error';
  apiCallsPerMinute: number;
  memoryUsage: number;
  errors: string[];
  warnings: string[];
  lastError?: string;
  lastErrorTime?: number;
}

export interface SystemHealthMetrics {
  totalBots: number;
  activeBots: number;
  healthyBots: number;
  warningBots: number;
  criticalBots: number;
  offlineBots: number;
  totalMemoryUsage: number;
  totalApiCalls: number;
  systemUptime: number;
  emergencyStopActive: boolean;
}

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  botId: string;
  severity: 'info' | 'warning' | 'critical';
  type: 'performance' | 'error' | 'connection' | 'trading';
  message: string;
  metrics?: Record<string, any>;
  resolved: boolean;
}

export class BotMonitor {
  private botMetrics: Map<string, BotHealthMetrics> = new Map();
  private performanceAlerts: PerformanceAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private systemStartTime: number = Date.now();
  private listeners: Set<(metrics: SystemHealthMetrics) => void> = new Set();
  private alertListeners: Set<(alert: PerformanceAlert) => void> = new Set();

  constructor() {
    this.startMonitoring();
    logger.info('Bot monitoring system initialized', {}, undefined, 'monitor');
  }

  /**
   * Register a bot for monitoring
   */
  public registerBot(botId: string, config: any): void {
    const metrics: BotHealthMetrics = {
      botId,
      status: 'healthy',
      lastUpdate: Date.now(),
      uptime: 0,
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      winRate: 0,
      currentPnl: 0,
      maxDrawdown: 0,
      avgExecutionTime: 0,
      websocketStatus: 'disconnected',
      apiCallsPerMinute: 0,
      memoryUsage: 0,
      errors: [],
      warnings: [],
    };

    this.botMetrics.set(botId, metrics);
    
    logger.info('Bot registered for monitoring', { botId }, botId, 'monitor');
  }

  /**
   * Unregister a bot from monitoring
   */
  public unregisterBot(botId: string): void {
    this.botMetrics.delete(botId);
    
    // Remove bot-specific alerts
    this.performanceAlerts = this.performanceAlerts.filter(alert => alert.botId !== botId);
    
    logger.info('Bot unregistered from monitoring', { botId }, botId, 'monitor');
  }

  /**
   * Update bot state
   */
  public updateBotState(botId: string, state: LiveBotStateForAsset): void {
    const metrics = this.botMetrics.get(botId);
    if (!metrics) return;

    const now = Date.now();
    metrics.lastUpdate = now;
    
    // Update uptime
    if (state.status === 'running' || state.status === 'analyzing' || state.status === 'position_open') {
      metrics.uptime = now - (metrics.lastUpdate || now);
    }

    // Update WebSocket status based on bot state
    if (state.status === 'error') {
      metrics.websocketStatus = 'error';
      metrics.status = 'critical';
    } else if (state.status === 'idle') {
      metrics.websocketStatus = 'disconnected';
      metrics.status = 'offline';
    } else {
      metrics.websocketStatus = 'connected';
      metrics.status = 'healthy';
    }

    // Check for warnings
    this.checkForWarnings(botId, metrics, state);
    
    this.botMetrics.set(botId, metrics);
  }

  /**
   * Record trade execution
   */
  public recordTrade(
    botId: string, 
    signal: TradeSignal, 
    success: boolean, 
    executionTime: number,
    pnl?: number
  ): void {
    const metrics = this.botMetrics.get(botId);
    if (!metrics) return;

    metrics.totalTrades++;
    
    if (success) {
      metrics.successfulTrades++;
    } else {
      metrics.failedTrades++;
    }

    metrics.winRate = metrics.totalTrades > 0 ? metrics.successfulTrades / metrics.totalTrades : 0;
    
    // Update execution time
    metrics.avgExecutionTime = metrics.avgExecutionTime === 0 
      ? executionTime 
      : (metrics.avgExecutionTime + executionTime) / 2;

    // Update PnL if provided
    if (pnl !== undefined) {
      metrics.currentPnl += pnl;
      
      // Track max drawdown
      if (pnl < 0) {
        const drawdown = Math.abs(pnl);
        if (drawdown > metrics.maxDrawdown) {
          metrics.maxDrawdown = drawdown;
        }
      }
    }

    // Check for performance issues
    this.checkTradePerformance(botId, metrics, success, executionTime);
    
    this.botMetrics.set(botId, metrics);
    
    logger.debug(
      `Trade recorded: ${success ? 'SUCCESS' : 'FAILED'}`,
      { botId, executionTime, pnl, winRate: metrics.winRate },
      botId,
      'monitor'
    );
  }

  /**
   * Record API call
   */
  public recordApiCall(botId: string, success: boolean, responseTime: number): void {
    const metrics = this.botMetrics.get(botId);
    if (!metrics) return;

    // Simple API calls per minute tracking (would need more sophisticated implementation)
    metrics.apiCallsPerMinute++;
    
    if (!success) {
      metrics.errors.push(`API call failed at ${new Date().toISOString()}`);
      metrics.errors = metrics.errors.slice(-10); // Keep last 10 errors
    }

    // Check for API rate limiting issues
    if (metrics.apiCallsPerMinute > 50) { // Binance limit is around 1200/minute, but 50/minute per bot is conservative
      this.createAlert(
        botId,
        'warning',
        'performance',
        'High API call rate detected',
        { apiCallsPerMinute: metrics.apiCallsPerMinute }
      );
    }

    this.botMetrics.set(botId, metrics);
  }

  /**
   * Record error
   */
  public recordError(botId: string, error: string, severity: 'warning' | 'critical' = 'warning'): void {
    const metrics = this.botMetrics.get(botId);
    if (!metrics) return;

    metrics.lastError = error;
    metrics.lastErrorTime = Date.now();
    
    if (severity === 'warning') {
      metrics.warnings.push(error);
      metrics.warnings = metrics.warnings.slice(-5); // Keep last 5 warnings
      
      if (metrics.status === 'healthy') {
        metrics.status = 'warning';
      }
    } else {
      metrics.errors.push(error);
      metrics.errors = metrics.errors.slice(-10); // Keep last 10 errors
      metrics.status = 'critical';
    }

    this.createAlert(botId, severity, 'error', error);
    this.botMetrics.set(botId, metrics);
  }

  /**
   * Get bot health metrics
   */
  public getBotMetrics(botId: string): BotHealthMetrics | undefined {
    return this.botMetrics.get(botId);
  }

  /**
   * Get all bot metrics
   */
  public getAllBotMetrics(): Map<string, BotHealthMetrics> {
    return new Map(this.botMetrics);
  }

  /**
   * Get system health overview
   */
  public getSystemHealth(): SystemHealthMetrics {
    const metrics = Array.from(this.botMetrics.values());
    
    return {
      totalBots: metrics.length,
      activeBots: metrics.filter(m => ['healthy', 'warning', 'critical'].includes(m.status)).length,
      healthyBots: metrics.filter(m => m.status === 'healthy').length,
      warningBots: metrics.filter(m => m.status === 'warning').length,
      criticalBots: metrics.filter(m => m.status === 'critical').length,
      offlineBots: metrics.filter(m => m.status === 'offline').length,
      totalMemoryUsage: metrics.reduce((sum, m) => sum + m.memoryUsage, 0),
      totalApiCalls: metrics.reduce((sum, m) => sum + m.apiCallsPerMinute, 0),
      systemUptime: Date.now() - this.systemStartTime,
      emergencyStopActive: emergencyStop.isEmergencyActive(),
    };
  }

  /**
   * Get performance alerts
   */
  public getAlerts(limit: number = 50): PerformanceAlert[] {
    return this.performanceAlerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get unresolved alerts
   */
  public getUnresolvedAlerts(): PerformanceAlert[] {
    return this.performanceAlerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.performanceAlerts.find(a => a.id === alertId);
    if (!alert || alert.resolved) return false;

    alert.resolved = true;
    
    logger.info('Performance alert resolved', { alertId, botId: alert.botId }, alert.botId, 'monitor');
    
    return true;
  }

  /**
   * Subscribe to system health updates
   */
  public subscribeToHealth(listener: (metrics: SystemHealthMetrics) => void): () => void {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribe to alerts
   */
  public subscribeToAlerts(listener: (alert: PerformanceAlert) => void): () => void {
    this.alertListeners.add(listener);
    
    return () => {
      this.alertListeners.delete(listener);
    };
  }

  /**
   * Perform health check on a specific bot
   */
  public performHealthCheck(botId: string): BotHealthStatus {
    const metrics = this.botMetrics.get(botId);
    if (!metrics) return 'offline';

    const now = Date.now();
    const timeSinceUpdate = now - metrics.lastUpdate;

    // Bot is offline if no updates for more than 5 minutes
    if (timeSinceUpdate > 300000) {
      metrics.status = 'offline';
      return 'offline';
    }

    // Check for critical issues
    if (metrics.errors.length > 5 || metrics.websocketStatus === 'error') {
      metrics.status = 'critical';
      return 'critical';
    }

    // Check for warnings
    if (metrics.warnings.length > 3 || metrics.winRate < 0.3 || timeSinceUpdate > 60000) {
      metrics.status = 'warning';
      return 'warning';
    }

    metrics.status = 'healthy';
    return 'healthy';
  }

  /**
   * Run comprehensive system diagnostics
   */
  public runDiagnostics(): {
    overallHealth: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const systemHealth = this.getSystemHealth();
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check for critical bots
    if (systemHealth.criticalBots > 0) {
      issues.push(`${systemHealth.criticalBots} bot(s) in critical state`);
      recommendations.push('Review and restart critical bots');
    }

    // Check for high API usage
    if (systemHealth.totalApiCalls > 200) {
      issues.push('High API call rate detected');
      recommendations.push('Consider reducing bot polling frequency');
    }

    // Check for emergency state
    if (systemHealth.emergencyStopActive) {
      issues.push('Emergency stop is currently active');
      recommendations.push('Review and resolve emergency conditions');
    }

    // Check for offline bots
    if (systemHealth.offlineBots > systemHealth.totalBots / 2) {
      issues.push('More than half of bots are offline');
      recommendations.push('Check network connectivity and bot configurations');
    }

    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (systemHealth.criticalBots > 0 || systemHealth.emergencyStopActive) {
      overallHealth = 'critical';
    } else if (issues.length > 0) {
      overallHealth = 'warning';
    }

    return { overallHealth, issues, recommendations };
  }

  /**
   * Start monitoring loop
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.performPeriodicChecks();
    }, 30000); // Every 30 seconds
  }

  /**
   * Perform periodic health checks
   */
  private performPeriodicChecks(): void {
    try {
      // Update health status for all bots
      for (const [botId] of this.botMetrics) {
        this.performHealthCheck(botId);
      }

      // Reset API call counters (simple implementation)
      for (const [botId, metrics] of this.botMetrics) {
        metrics.apiCallsPerMinute = Math.max(0, metrics.apiCallsPerMinute - 1);
        this.botMetrics.set(botId, metrics);
      }

      // Clean up old alerts
      this.cleanupOldAlerts();

      // Notify listeners
      const systemHealth = this.getSystemHealth();
      this.notifyHealthListeners(systemHealth);

      // Log system health summary
      logger.debug(
        'System health check completed',
        {
          totalBots: systemHealth.totalBots,
          healthyBots: systemHealth.healthyBots,
          warningBots: systemHealth.warningBots,
          criticalBots: systemHealth.criticalBots
        },
        undefined,
        'monitor'
      );

    } catch (error: any) {
      logger.error(
        `Monitoring system error: ${error.message}`,
        { error: error.message },
        undefined,
        'monitor'
      );
    }
  }

  /**
   * Check for warnings based on bot state
   */
  private checkForWarnings(botId: string, metrics: BotHealthMetrics, state: LiveBotStateForAsset): void {
    const now = Date.now();
    
    // Check for stale position
    if (state.activePosition) {
      const positionAge = now - state.activePosition.timestamp;
      if (positionAge > 3600000) { // 1 hour
        this.createAlert(
          botId,
          'warning',
          'trading',
          'Position held for more than 1 hour',
          { positionAge, symbol: state.activePosition.asset }
        );
      }
    }

    // Check for low win rate
    if (metrics.totalTrades > 10 && metrics.winRate < 0.3) {
      this.createAlert(
        botId,
        'warning',
        'performance',
        `Low win rate: ${(metrics.winRate * 100).toFixed(1)}%`,
        { winRate: metrics.winRate, totalTrades: metrics.totalTrades }
      );
    }
  }

  /**
   * Check trade performance for issues
   */
  private checkTradePerformance(
    botId: string, 
    metrics: BotHealthMetrics, 
    success: boolean, 
    executionTime: number
  ): void {
    // Check for slow execution
    if (executionTime > 10000) { // 10 seconds
      this.createAlert(
        botId,
        'warning',
        'performance',
        'Slow trade execution detected',
        { executionTime }
      );
    }

    // Check for consecutive failures
    if (!success && metrics.failedTrades > 0) {
      const recentTrades = metrics.totalTrades;
      const failureRate = metrics.failedTrades / recentTrades;
      
      if (failureRate > 0.5 && recentTrades >= 5) {
        this.createAlert(
          botId,
          'critical',
          'trading',
          'High failure rate detected',
          { failureRate, totalTrades: recentTrades }
        );
      }
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(
    botId: string,
    severity: 'info' | 'warning' | 'critical',
    type: 'performance' | 'error' | 'connection' | 'trading',
    message: string,
    metrics?: Record<string, any>
  ): void {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      botId,
      severity,
      type,
      message,
      metrics,
      resolved: false,
    };

    this.performanceAlerts.push(alert);
    
    // Keep only recent alerts
    if (this.performanceAlerts.length > 1000) {
      this.performanceAlerts = this.performanceAlerts
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 500);
    }

    // Notify alert listeners
    this.notifyAlertListeners(alert);

    logger.info(
      `Performance alert: ${message}`,
      { severity, type, metrics },
      botId,
      'monitor'
    );
  }

  /**
   * Clean up old alerts
   */
  private cleanupOldAlerts(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    const beforeCount = this.performanceAlerts.length;
    
    this.performanceAlerts = this.performanceAlerts.filter(alert => 
      alert.timestamp > cutoffTime || !alert.resolved
    );

    const removedCount = beforeCount - this.performanceAlerts.length;
    if (removedCount > 0) {
      logger.debug(`Cleaned up ${removedCount} old alerts`, { removedCount }, undefined, 'monitor');
    }
  }

  /**
   * Notify health listeners
   */
  private notifyHealthListeners(metrics: SystemHealthMetrics): void {
    for (const listener of this.listeners) {
      try {
        listener(metrics);
      } catch (error: any) {
        logger.error(
          `Error notifying health listener: ${error.message}`,
          { error: error.message },
          undefined,
          'monitor'
        );
      }
    }
  }

  /**
   * Notify alert listeners
   */
  private notifyAlertListeners(alert: PerformanceAlert): void {
    for (const listener of this.alertListeners) {
      try {
        listener(alert);
      } catch (error: any) {
        logger.error(
          `Error notifying alert listener: ${error.message}`,
          { error: error.message },
          undefined,
          'monitor'
        );
      }
    }
  }

  /**
   * Destroy monitor
   */
  public destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.botMetrics.clear();
    this.performanceAlerts = [];
    this.listeners.clear();
    this.alertListeners.clear();

    logger.info('Bot monitoring system destroyed', {}, undefined, 'monitor');
  }
}

// Export singleton instance
export const botMonitor = new BotMonitor();