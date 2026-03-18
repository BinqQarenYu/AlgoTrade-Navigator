// Type declaration for @binance/connector (no official @types package exists)
declare module '@binance/connector' {
  interface SpotOptions {
    baseURL?: string;
    timeout?: number;
    logger?: any;
    httpsAgent?: any;
  }

  interface ApiResponse<T = any> {
    data: T;
    status: number;
    headers: Record<string, string>;
  }

  class Spot {
    constructor(apiKey?: string, secretKey?: string, options?: SpotOptions);
    exchangeInfo(params?: Record<string, any>): Promise<ApiResponse>;
    newOrder(
      symbol: string,
      side: 'BUY' | 'SELL',
      type: 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET',
      params?: Record<string, any>
    ): Promise<ApiResponse>;
    futuresTransfer(asset: string, amount: string, type: number): Promise<ApiResponse>;
    cancelOrder(symbol: string, params?: Record<string, any>): Promise<ApiResponse>;
    getOrder(symbol: string, params?: Record<string, any>): Promise<ApiResponse>;
    account(params?: Record<string, any>): Promise<ApiResponse>;
  }
}
