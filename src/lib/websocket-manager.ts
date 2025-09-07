'use client';

import { logger } from './logger';
import { TradingErrorHandler, withRetry } from './error-handler';
import type { HistoricalData } from './types';

/**
 * Resilient WebSocket connection manager with auto-reconnection
 */

export type WebSocketState = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'CLOSED';

export interface WebSocketConfig {
  url: string;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  pingInterval: number;
  pongTimeout: number;
  maxMissedPings: number;
}

export interface KlineData {
  eventType: string;
  eventTime: number;
  symbol: string;
  kline: {
    openTime: number;
    closeTime: number;
    symbol: string;
    interval: string;
    firstTradeId: number;
    lastTradeId: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    trades: number;
    isClosed: boolean;
    quoteVolume: string;
    buyVolume: string;
    quoteBuyVolume: string;
  };
}

export class ResilientWebSocket {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private state: WebSocketState = 'DISCONNECTED';
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private pongTimer: NodeJS.Timeout | null = null;
  private missedPings: number = 0;
  private listeners: Map<string, Set<Function>> = new Map();
  private isDestroyed: boolean = false;
  private lastPongTime: number = 0;
  private botId: string;

  constructor(botId: string, config: Partial<WebSocketConfig> = {}) {
    this.botId = botId;
    this.config = {
      url: '',
      maxReconnectAttempts: parseInt(process.env.WS_RECONNECT_ATTEMPTS || '5', 10),
      reconnectDelay: parseInt(process.env.WS_RECONNECT_DELAY_MS || '3000', 10),
      pingInterval: parseInt(process.env.WS_PING_INTERVAL_MS || '30000', 10),
      pongTimeout: 10000,
      maxMissedPings: 3,
      ...config
    };

    // Bind methods to preserve context
    this.handleOpen = this.handleOpen.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  public connect(url: string): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('WebSocket manager has been destroyed');
    }

    this.config.url = url;

    return new Promise((resolve, reject) => {
      try {
        if (this.ws?.readyState === WebSocket.CONNECTING || this.ws?.readyState === WebSocket.OPEN) {
          logger.debug('WebSocket already connecting or connected', { url }, this.botId, 'websocket');
          resolve();
          return;
        }

        this.setState('CONNECTING');
        
        logger.info('Connecting to WebSocket', { url }, this.botId, 'websocket');
        
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
          this.handleOpen();
          resolve();
        };
        
        this.ws.onmessage = this.handleMessage;
        this.ws.onclose = this.handleClose;
        this.ws.onerror = (event) => {
          this.handleError(event);
          reject(new Error('WebSocket connection failed'));
        };

        // Connection timeout
        setTimeout(() => {
          if (this.state === 'CONNECTING') {
            this.ws?.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

      } catch (error: any) {
        logger.error(`Failed to create WebSocket connection: ${error.message}`, { url, error: error.message }, this.botId, 'websocket');
        this.setState('ERROR');
        reject(error);
      }
    });
  }

  public disconnect(): void {
    logger.info('Disconnecting WebSocket', { url: this.config.url }, this.botId, 'websocket');
    
    this.clearTimers();
    this.reconnectAttempts = 0;
    
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Normal closure');
      }
      
      this.ws = null;
    }
    
    this.setState('DISCONNECTED');
  }

  public send(data: string | object): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot send data: WebSocket not connected', { state: this.state }, this.botId, 'websocket');
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws.send(message);
      return true;
    } catch (error: any) {
      logger.error(`Failed to send WebSocket message: ${error.message}`, { error: error.message }, this.botId, 'websocket');
      return false;
    }
  }

  public addEventListener(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  public removeEventListener(event: string, listener: Function): void {
    this.listeners.get(event)?.delete(listener);
  }

  public getState(): WebSocketState {
    return this.state;
  }

  public isConnected(): boolean {
    return this.state === 'CONNECTED' && this.ws?.readyState === WebSocket.OPEN;
  }

  public getConnectionInfo(): {
    state: WebSocketState;
    url: string;
    reconnectAttempts: number;
    lastPongTime: number;
    missedPings: number;
  } {
    return {
      state: this.state,
      url: this.config.url,
      reconnectAttempts: this.reconnectAttempts,
      lastPongTime: this.lastPongTime,
      missedPings: this.missedPings,
    };
  }

  private handleOpen(): void {
    logger.info('WebSocket connected successfully', { url: this.config.url }, this.botId, 'websocket');
    
    this.setState('CONNECTED');
    this.reconnectAttempts = 0;
    this.missedPings = 0;
    this.lastPongTime = Date.now();
    
    this.startPingPong();
    this.emit('open');
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // Handle pong messages
      if (data.ping) {
        this.send({ pong: data.ping });
        this.lastPongTime = Date.now();
        this.missedPings = 0;
        return;
      }

      // Handle kline data
      if (data.e === 'kline') {
        const klineData: KlineData = data;
        const candle: HistoricalData = {
          time: klineData.kline.openTime,
          open: parseFloat(klineData.kline.open),
          high: parseFloat(klineData.kline.high),
          low: parseFloat(klineData.kline.low),
          close: parseFloat(klineData.kline.close),
          volume: parseFloat(klineData.kline.volume),
        };

        this.emit('kline', candle, klineData.kline.isClosed);
        
        if (klineData.kline.isClosed) {
          logger.debug(
            `New candle closed: ${klineData.symbol} @ ${candle.close}`,
            { symbol: klineData.symbol, close: candle.close, volume: candle.volume },
            this.botId,
            'websocket'
          );
        }
      }

      this.emit('message', data);
      
    } catch (error: any) {
      logger.error(
        `Failed to parse WebSocket message: ${error.message}`,
        { error: error.message, rawData: event.data },
        this.botId,
        'websocket'
      );
    }
  }

  private handleClose(event: CloseEvent): void {
    const reason = event.reason || 'Unknown reason';
    logger.warn(
      `WebSocket connection closed: ${reason} (Code: ${event.code})`,
      { code: event.code, reason, wasClean: event.wasClean },
      this.botId,
      'websocket'
    );

    this.clearTimers();
    this.setState('DISCONNECTED');
    this.emit('close', event);

    // Attempt reconnection if not a normal closure and not destroyed
    if (!this.isDestroyed && event.code !== 1000 && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error(
        `Max reconnection attempts (${this.config.maxReconnectAttempts}) exceeded`,
        { maxAttempts: this.config.maxReconnectAttempts },
        this.botId,
        'websocket'
      );
      this.setState('ERROR');
    }
  }

  private handleError(event: Event): void {
    logger.error('WebSocket error occurred', { event }, this.botId, 'websocket');
    this.setState('ERROR');
    this.emit('error', event);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isDestroyed) return;

    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000 // Cap at 30 seconds
    );

    logger.info(
      `Scheduling reconnection attempt ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts} in ${delay}ms`,
      { attempt: this.reconnectAttempts + 1, maxAttempts: this.config.maxReconnectAttempts, delay },
      this.botId,
      'websocket'
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.attemptReconnect();
    }, delay);
  }

  private async attemptReconnect(): Promise<void> {
    if (this.isDestroyed) return;

    this.reconnectAttempts++;
    
    try {
      await this.connect(this.config.url);
      logger.info('WebSocket reconnection successful', { attempt: this.reconnectAttempts }, this.botId, 'websocket');
    } catch (error: any) {
      logger.error(
        `Reconnection attempt ${this.reconnectAttempts} failed: ${error.message}`,
        { attempt: this.reconnectAttempts, error: error.message },
        this.botId,
        'websocket'
      );

      if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        this.setState('ERROR');
        this.emit('maxReconnectAttemptsExceeded');
      }
    }
  }

  private startPingPong(): void {
    this.clearPingPong();

    this.pingTimer = setInterval(() => {
      if (!this.isConnected()) {
        this.clearPingPong();
        return;
      }

      const timeSinceLastPong = Date.now() - this.lastPongTime;
      
      if (timeSinceLastPong > this.config.pongTimeout) {
        this.missedPings++;
        
        logger.warn(
          `Missed ping response (${this.missedPings}/${this.config.maxMissedPings})`,
          { missedPings: this.missedPings, maxMissedPings: this.config.maxMissedPings },
          this.botId,
          'websocket'
        );

        if (this.missedPings >= this.config.maxMissedPings) {
          logger.error(
            'Too many missed pings, closing connection',
            { missedPings: this.missedPings },
            this.botId,
            'websocket'
          );
          this.ws?.close(1001, 'Ping timeout');
          return;
        }
      }

      // Send ping
      this.send({ ping: Date.now() });
    }, this.config.pingInterval);
  }

  private clearPingPong(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearPingPong();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setState(newState: WebSocketState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      
      logger.debug(
        `WebSocket state changed: ${oldState} -> ${newState}`,
        { oldState, newState },
        this.botId,
        'websocket'
      );
      
      this.emit('stateChange', { oldState, newState });
    }
  }

  private emit(event: string, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error: any) {
          logger.error(
            `Error in WebSocket event listener for '${event}': ${error.message}`,
            { event, error: error.message },
            this.botId,
            'websocket'
          );
        }
      });
    }
  }

  public destroy(): void {
    logger.info('Destroying WebSocket manager', { url: this.config.url }, this.botId, 'websocket');
    
    this.isDestroyed = true;
    this.clearTimers();
    this.disconnect();
    this.listeners.clear();
  }
}

/**
 * WebSocket manager for multiple connections
 */
export class WebSocketManager {
  private connections: Map<string, ResilientWebSocket> = new Map();

  public createConnection(botId: string, config?: Partial<WebSocketConfig>): ResilientWebSocket {
    if (this.connections.has(botId)) {
      this.connections.get(botId)?.destroy();
    }

    const connection = new ResilientWebSocket(botId, config);
    this.connections.set(botId, connection);

    logger.info(`WebSocket connection created for bot ${botId}`, { botId }, botId, 'websocket');

    return connection;
  }

  public getConnection(botId: string): ResilientWebSocket | undefined {
    return this.connections.get(botId);
  }

  public removeConnection(botId: string): void {
    const connection = this.connections.get(botId);
    if (connection) {
      connection.destroy();
      this.connections.delete(botId);
      logger.info(`WebSocket connection removed for bot ${botId}`, { botId }, botId, 'websocket');
    }
  }

  public getAllConnections(): Map<string, ResilientWebSocket> {
    return new Map(this.connections);
  }

  public getConnectionStats(): {
    total: number;
    connected: number;
    connecting: number;
    disconnected: number;
    error: number;
  } {
    const stats = {
      total: this.connections.size,
      connected: 0,
      connecting: 0,
      disconnected: 0,
      error: 0,
    };

    for (const connection of this.connections.values()) {
      const state = connection.getState();
      switch (state) {
        case 'CONNECTED':
          stats.connected++;
          break;
        case 'CONNECTING':
          stats.connecting++;
          break;
        case 'DISCONNECTED':
          stats.disconnected++;
          break;
        case 'ERROR':
        case 'CLOSED':
          stats.error++;
          break;
      }
    }

    return stats;
  }

  public destroyAll(): void {
    logger.info('Destroying all WebSocket connections', { count: this.connections.size }, undefined, 'websocket');
    
    for (const connection of this.connections.values()) {
      connection.destroy();
    }
    
    this.connections.clear();
  }
}

// Export singleton instance
export const wsManager = new WebSocketManager();