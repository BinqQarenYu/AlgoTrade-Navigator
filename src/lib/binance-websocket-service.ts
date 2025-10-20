'use client';

/**
 * Binance WebSocket Service for Real-time Order Flow Data
 * Provides live trade streams, order book depth, and aggregated trade data
 */

export interface BinanceTradeData {
  e: string;      // Event type
  E: number;      // Event time
  s: string;      // Symbol
  t: number;      // Trade ID
  p: string;      // Price
  q: string;      // Quantity
  b: number;      // Buyer order ID
  a: number;      // Seller order ID
  T: number;      // Trade time
  m: boolean;     // Is the buyer the market maker?
  M: boolean;     // Ignore
}

export interface BinanceAggTradeData {
  e: string;      // Event type
  E: number;      // Event time
  s: string;      // Symbol
  a: number;      // Aggregate trade ID
  p: string;      // Price
  q: string;      // Quantity
  f: number;      // First trade ID
  l: number;      // Last trade ID
  T: number;      // Trade time
  m: boolean;     // Is the buyer the market maker?
  M: boolean;     // Ignore
}

export interface BinanceDepthData {
  e: string;        // Event type
  E: number;        // Event time
  s: string;        // Symbol
  U: number;        // First update ID in event
  u: number;        // Final update ID in event
  b: [string, string][]; // Bids to be updated [Price level, Quantity]
  a: [string, string][]; // Asks to be updated [Price level, Quantity]
}

export interface OrderFlowData {
  id: string;
  timestamp: number;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  volume: number; // price * quantity
  tradeId?: number;
  isBuyerMaker: boolean;
  source: 'binance-ws';
}

export type BinanceStreamCallback = (data: OrderFlowData) => void;
export type BinanceErrorCallback = (error: Error) => void;
export type BinanceConnectionCallback = (connected: boolean) => void;

export class BinanceWebSocketService {
  private ws: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private callbacks: Map<string, BinanceStreamCallback> = new Map();
  private errorCallback: BinanceErrorCallback | null = null;
  private connectionCallback: BinanceConnectionCallback | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  constructor() {
    this.connect = this.connect.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleClose = this.handleClose.bind(this);
  }

  /**
   * Connect to Binance WebSocket
   */
  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    
    try {
      // Use the public Binance WebSocket stream endpoint
      const wsUrl = 'wss://stream.binance.com:9443/ws/stream';
      
      console.log('🔗 Connecting to Binance WebSocket...');
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ Binance WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.connectionCallback?.(true);
        
        // Resubscribe to existing streams
        this.resubscribeStreams();
      };
      
      this.ws.onmessage = this.handleMessage;
      this.ws.onerror = this.handleError;
      this.ws.onclose = this.handleClose;
      
    } catch (error) {
      this.isConnecting = false;
      console.error('❌ Failed to create WebSocket connection:', error);
      this.errorCallback?.(error as Error);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // Handle stream data
      if (data.stream && data.data) {
        this.processStreamData(data.stream, data.data);
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  }

  /**
   * Process different types of stream data
   */
  private processStreamData(stream: string, data: any): void {
    try {
      // Extract symbol from stream name
      const symbol = this.extractSymbolFromStream(stream);
      if (!symbol) return;

      let orderFlowData: OrderFlowData | null = null;

      // Handle different stream types
      if (stream.includes('@trade')) {
        orderFlowData = this.processTradeData(data as BinanceTradeData);
      } else if (stream.includes('@aggTrade')) {
        orderFlowData = this.processAggTradeData(data as BinanceAggTradeData);
      }

      // Send processed data to callbacks
      if (orderFlowData) {
        const callback = this.callbacks.get(symbol);
        if (callback) {
          callback(orderFlowData);
        }
      }
    } catch (error) {
      console.error('❌ Error processing stream data:', error);
    }
  }

  /**
   * Process individual trade data
   */
  private processTradeData(trade: BinanceTradeData): OrderFlowData {
    const price = parseFloat(trade.p);
    const quantity = parseFloat(trade.q);
    
    return {
      id: `${trade.s}-${trade.t}-${trade.T}`,
      timestamp: trade.T,
      symbol: trade.s,
      side: trade.m ? 'sell' : 'buy', // If buyer is market maker, it's a sell order
      price: price,
      quantity: quantity,
      volume: price * quantity,
      tradeId: trade.t,
      isBuyerMaker: trade.m,
      source: 'binance-ws'
    };
  }

  /**
   * Process aggregated trade data
   */
  private processAggTradeData(aggTrade: BinanceAggTradeData): OrderFlowData {
    const price = parseFloat(aggTrade.p);
    const quantity = parseFloat(aggTrade.q);
    
    return {
      id: `${aggTrade.s}-agg-${aggTrade.a}-${aggTrade.T}`,
      timestamp: aggTrade.T,
      symbol: aggTrade.s,
      side: aggTrade.m ? 'sell' : 'buy',
      price: price,
      quantity: quantity,
      volume: price * quantity,
      tradeId: aggTrade.a,
      isBuyerMaker: aggTrade.m,
      source: 'binance-ws'
    };
  }

  /**
   * Extract symbol from stream name
   */
  private extractSymbolFromStream(stream: string): string | null {
    // Stream format: btcusdt@trade or btcusdt@aggTrade
    const parts = stream.split('@');
    if (parts.length >= 1) {
      return parts[0].toUpperCase();
    }
    return null;
  }

  /**
   * Subscribe to trade stream for a symbol
   */
  subscribeToTrades(symbol: string, callback: BinanceStreamCallback): void {
    console.log(`📡 Subscribing to trades for ${symbol}`);
    
    this.callbacks.set(symbol, callback);
    
    const streamName = `${symbol.toLowerCase()}@trade`;
    this.subscriptions.add(streamName);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSubscription(streamName, 'SUBSCRIBE');
    }
  }

  /**
   * Subscribe to aggregated trade stream for a symbol
   */
  subscribeToAggTrades(symbol: string, callback: BinanceStreamCallback): void {
    console.log(`📡 Subscribing to aggregated trades for ${symbol}`);
    
    this.callbacks.set(symbol, callback);
    
    const streamName = `${symbol.toLowerCase()}@aggTrade`;
    this.subscriptions.add(streamName);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSubscription(streamName, 'SUBSCRIBE');
    }
  }

  /**
   * Unsubscribe from a symbol
   */
  unsubscribe(symbol: string): void {
    console.log(`🔇 Unsubscribing from ${symbol}`);
    
    this.callbacks.delete(symbol);
    
    // Remove all streams for this symbol
    const streamsToRemove = Array.from(this.subscriptions).filter(stream => 
      stream.startsWith(symbol.toLowerCase())
    );
    
    streamsToRemove.forEach(streamName => {
      this.subscriptions.delete(streamName);
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendSubscription(streamName, 'UNSUBSCRIBE');
      }
    });
  }

  /**
   * Send subscription/unsubscription message
   */
  private sendSubscription(streamName: string, method: 'SUBSCRIBE' | 'UNSUBSCRIBE'): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not connected, cannot send subscription');
      return;
    }

    const message = {
      method: method,
      params: [streamName],
      id: Date.now()
    };

    console.log(`📤 Sending ${method} for ${streamName}`);
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Resubscribe to all existing streams after reconnection
   */
  private resubscribeStreams(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    console.log('🔄 Resubscribing to existing streams...');
    
    this.subscriptions.forEach(streamName => {
      this.sendSubscription(streamName, 'SUBSCRIBE');
    });
  }

  /**
   * Handle WebSocket errors
   */
  private handleError(event: Event): void {
    console.error('❌ Binance WebSocket error:', event);
    this.errorCallback?.(new Error('WebSocket connection error'));
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(event: CloseEvent): void {
    console.log('🔌 Binance WebSocket closed:', event.code, event.reason);
    this.isConnecting = false;
    this.connectionCallback?.(false);
    
    // Attempt to reconnect if not intentionally closed
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts)); // Exponential backoff
    }
  }

  /**
   * Set error callback
   */
  onError(callback: BinanceErrorCallback): void {
    this.errorCallback = callback;
  }

  /**
   * Set connection status callback
   */
  onConnection(callback: BinanceConnectionCallback): void {
    this.connectionCallback = callback;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    console.log('🔌 Disconnecting Binance WebSocket...');
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.subscriptions.clear();
    this.callbacks.clear();
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current subscriptions
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }
}

// Create a singleton instance
export const binanceWebSocketService = new BinanceWebSocketService();