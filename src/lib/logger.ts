'use client';

/**
 * Comprehensive logging system for the trading bot
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  botId?: string;
  category: string;
  source: string;
}

export interface LogFilter {
  level?: LogLevel;
  botId?: string;
  category?: string;
  source?: string;
  timeRange?: { start: number; end: number };
}

export class TradingLogger {
  private static instance: TradingLogger;
  private logs: LogEntry[] = [];
  private maxEntries: number;
  private retentionHours: number;
  private logLevel: LogLevel;
  private listeners: Set<(logs: LogEntry[]) => void> = new Set();

  private constructor() {
    this.maxEntries = parseInt(process.env.LOG_MAX_ENTRIES || '1000', 10);
    this.retentionHours = parseInt(process.env.LOG_RETENTION_HOURS || '24', 10);
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
    
    // Clean up old logs periodically
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  public static getInstance(): TradingLogger {
    if (!TradingLogger.instance) {
      TradingLogger.instance = new TradingLogger();
    }
    return TradingLogger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      critical: 4
    };
    
    return levels[level] >= levels[this.logLevel];
  }

  public log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    botId?: string,
    category: string = 'general',
    source: string = 'bot'
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      message,
      context,
      botId,
      category,
      source
    };

    this.logs.push(entry);
    
    // Keep only the most recent entries
    if (this.logs.length > this.maxEntries) {
      this.logs = this.logs.slice(-this.maxEntries);
    }

    // Notify listeners
    this.notifyListeners();

    // Console output for development
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      const timestamp = new Date(entry.timestamp).toISOString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [${category}]${botId ? ` [${botId}]` : ''}`;
      
      switch (level) {
        case 'debug':
          console.debug(prefix, message, context);
          break;
        case 'info':
          console.info(prefix, message, context);
          break;
        case 'warn':
          console.warn(prefix, message, context);
          break;
        case 'error':
        case 'critical':
          console.error(prefix, message, context);
          break;
      }
    }
  }

  public debug(message: string, context?: Record<string, any>, botId?: string, category?: string): void {
    this.log('debug', message, context, botId, category || 'debug');
  }

  public info(message: string, context?: Record<string, any>, botId?: string, category?: string): void {
    this.log('info', message, context, botId, category || 'info');
  }

  public warn(message: string, context?: Record<string, any>, botId?: string, category?: string): void {
    this.log('warn', message, context, botId, category || 'warning');
  }

  public error(message: string, context?: Record<string, any>, botId?: string, category?: string): void {
    this.log('error', message, context, botId, category || 'error');
  }

  public critical(message: string, context?: Record<string, any>, botId?: string, category?: string): void {
    this.log('critical', message, context, botId, category || 'critical');
  }

  // Specialized logging methods for trading activities
  public logTrade(
    botId: string,
    action: 'BUY' | 'SELL',
    symbol: string,
    quantity: number,
    price: number,
    orderId?: string,
    context?: Record<string, any>
  ): void {
    this.info(
      `Trade executed: ${action} ${quantity} ${symbol} @ ${price}`,
      { ...context, action, symbol, quantity, price, orderId },
      botId,
      'trading'
    );
  }

  public logPosition(
    botId: string,
    action: 'OPEN' | 'CLOSE',
    symbol: string,
    side: 'LONG' | 'SHORT',
    size: number,
    price: number,
    pnl?: number,
    context?: Record<string, any>
  ): void {
    this.info(
      `Position ${action.toLowerCase()}: ${side} ${size} ${symbol} @ ${price}${pnl !== undefined ? ` PnL: ${pnl}` : ''}`,
      { ...context, action, symbol, side, size, price, pnl },
      botId,
      'position'
    );
  }

  public logSignal(
    botId: string,
    signal: 'BUY' | 'SELL' | 'HOLD',
    symbol: string,
    strategy: string,
    confidence: number,
    reasoning?: string,
    context?: Record<string, any>
  ): void {
    this.info(
      `Signal generated: ${signal} ${symbol} (${strategy}) - Confidence: ${confidence}`,
      { ...context, signal, symbol, strategy, confidence, reasoning },
      botId,
      'signal'
    );
  }

  public logWebSocket(
    botId: string,
    event: 'CONNECT' | 'DISCONNECT' | 'ERROR' | 'MESSAGE',
    message: string,
    context?: Record<string, any>
  ): void {
    const level: LogLevel = event === 'ERROR' ? 'error' : 'info';
    this.log(
      level,
      `WebSocket ${event}: ${message}`,
      context,
      botId,
      'websocket'
    );
  }

  public logRisk(
    botId: string,
    event: 'COOLDOWN' | 'DRAWDOWN_LIMIT' | 'CONSECUTIVE_LOSSES' | 'EMERGENCY_STOP',
    message: string,
    context?: Record<string, any>
  ): void {
    const level: LogLevel = event === 'EMERGENCY_STOP' ? 'critical' : 'warn';
    this.log(
      level,
      `Risk Management: ${message}`,
      context,
      botId,
      'risk'
    );
  }

  public getLogs(filter?: LogFilter): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level) {
        const levels: Record<LogLevel, number> = {
          debug: 0, info: 1, warn: 2, error: 3, critical: 4
        };
        const minLevel = levels[filter.level];
        filteredLogs = filteredLogs.filter(log => levels[log.level] >= minLevel);
      }

      if (filter.botId) {
        filteredLogs = filteredLogs.filter(log => log.botId === filter.botId);
      }

      if (filter.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filter.category);
      }

      if (filter.source) {
        filteredLogs = filteredLogs.filter(log => log.source === filter.source);
      }

      if (filter.timeRange) {
        filteredLogs = filteredLogs.filter(log => 
          log.timestamp >= filter.timeRange!.start && 
          log.timestamp <= filter.timeRange!.end
        );
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getLogsByBot(botId: string): LogEntry[] {
    return this.getLogs({ botId });
  }

  public getLogsByCategory(category: string): LogEntry[] {
    return this.getLogs({ category });
  }

  public subscribe(listener: (logs: LogEntry[]) => void): () => void {
    this.listeners.add(listener);
    // Send current logs immediately
    listener(this.logs);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener([...this.logs]);
      } catch (error) {
        console.error('Error notifying log listener:', error);
      }
    }
  }

  private cleanup(): void {
    const cutoffTime = Date.now() - (this.retentionHours * 60 * 60 * 1000);
    const beforeCount = this.logs.length;
    
    this.logs = this.logs.filter(log => log.timestamp > cutoffTime);
    
    if (this.logs.length < beforeCount) {
      console.debug(`Cleaned up ${beforeCount - this.logs.length} old log entries`);
    }
  }

  public exportLogs(filter?: LogFilter): string {
    const logs = this.getLogs(filter);
    
    return logs.map(log => {
      const timestamp = new Date(log.timestamp).toISOString();
      const contextStr = log.context ? ` | ${JSON.stringify(log.context)}` : '';
      const botStr = log.botId ? ` | Bot: ${log.botId}` : '';
      
      return `${timestamp} | ${log.level.toUpperCase()} | ${log.category} | ${log.message}${botStr}${contextStr}`;
    }).join('\n');
  }

  public clearLogs(): void {
    this.logs = [];
    this.notifyListeners();
  }
}

// Export singleton instance
export const logger = TradingLogger.getInstance();

// Utility functions for common log formats
export function formatPrice(price: number): string {
  return price.toFixed(8).replace(/\.?0+$/, '');
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}