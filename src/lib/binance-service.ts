
'use server';

import type { Portfolio, Position, Trade, HistoricalData, OrderSide, OrderResult } from './types';
import type { Ticker } from 'ccxt';
import crypto from 'crypto';
import ccxt from 'ccxt';

const BINANCE_API_URL = 'https://fapi.binance.com';

// CCXT instance for public market data (no API keys needed here)
const binance = new ccxt.binance({
    options: { defaultType: 'future' },
});

// Cache for markets to avoid repeated API calls
let marketsCache: ccxt.Markets | null = null;
let marketsCacheTime: number = 0;

export const getMarkets = async (forceRefresh = false): Promise<ccxt.Markets> => {
    const now = Date.now();
    // Refresh cache every hour
    if (forceRefresh || !marketsCache || (now - marketsCacheTime > 3600 * 1000)) {
        console.log('Fetching and caching markets from Binance...');
        try {
            marketsCache = await binance.loadMarkets();
            marketsCacheTime = now;
        } catch (error) {
            console.error('Failed to fetch/cache markets:', error);
            // In case of error, return the stale cache if it exists, otherwise throw
            if (marketsCache) return marketsCache;
            throw error;
        }
    }
    return marketsCache;
};

// Helper for authenticated Binance API calls
const callAuthenticatedApi = async <T>(path: string, queryString: string, apiKey: string, secretKey: string): Promise<{ data: T, usedWeight: number }> => {
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(queryString)
    .digest('hex');

  const url = `${BINANCE_API_URL}${path}?${queryString}&signature=${signature}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'X-MBX-APIKEY': apiKey, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    const usedWeight = parseInt(response.headers.get('x-fapi-used-weight-1m') || '0', 10);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Binance API Error: ${data.msg || `Failed to fetch from ${path}`} (Code: ${data.code})`);
    }
    return { data: data as T, usedWeight };
  } catch (error: any) {
    console.error(`Error fetching from Binance API (${path}):`, error);
    if (error.message.includes('Binance API Error')) {
      throw error;
    }
    throw new Error("Failed to connect to Binance. Please check your network connection and API keys.");
  }
};


export const getAccountBalance = async (apiKey: string, secretKey: string): Promise<{ data: Portfolio, usedWeight: number }> => {
  console.log("Fetching real account balance from Binance...");
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const { data, usedWeight } = await callAuthenticatedApi<any>('/fapi/v2/account', queryString, apiKey, secretKey);

  const portfolioData = {
    balance: parseFloat(data.totalWalletBalance),
    totalPnl: parseFloat(data.totalUnrealizedProfit),
    dailyVolume: 0, // Not available from this endpoint
  };
  return { data: portfolioData, usedWeight };
};

export const getOpenPositions = async (apiKey: string, secretKey: string): Promise<{ data: Position[], usedWeight: number }> => {
  console.log("Fetching open positions from Binance...");
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const { data, usedWeight } = await callAuthenticatedApi<any[]>('/fapi/v2/positionRisk', queryString, apiKey, secretKey);

  const positionsData = data
    .filter((pos: any) => parseFloat(pos.positionAmt) !== 0)
    .map((pos: any): Position => {
      const positionAmt = parseFloat(pos.positionAmt);
      return {
        symbol: pos.symbol,
        side: positionAmt > 0 ? 'LONG' : 'SHORT',
        size: Math.abs(positionAmt),
        entryPrice: parseFloat(pos.entryPrice),
        markPrice: parseFloat(pos.markPrice),
        pnl: parseFloat(pos.unRealizedProfit),
        leverage: `${pos.leverage}x`,
      };
    });
  return { data: positionsData, usedWeight };
};

export const getTradeHistory = async (symbol: string, apiKey: string, secretKey: string): Promise<{ data: Trade[], usedWeight: number }> => {
    console.log(`Fetching trade history for ${symbol} from Binance...`);
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}&timestamp=${timestamp}&limit=50`;
    const { data, usedWeight } = await callAuthenticatedApi<any[]>(`/fapi/v1/userTrades`, queryString, apiKey, secretKey);

    const tradesData = data.map((trade: any): Trade => ({
        id: String(trade.id),
        symbol: trade.symbol,
        side: trade.isBuyer ? 'BUY' : 'SELL',
        size: parseFloat(trade.qty),
        price: parseFloat(trade.price),
        time: new Date(trade.time).toLocaleString(),
        timestamp: trade.time,
    }));
    return { data: tradesData, usedWeight };
};

// Public endpoint, using CCXT for robustness
export const getHistoricalKlines = async (
    symbol: string, 
    interval: string, 
    startTime: number, 
    endTime: number
): Promise<HistoricalData[]> => {
    if (!symbol) {
        console.error("getHistoricalKlines was called without a symbol.");
        return [];
    }
    const upperSymbol = symbol.toUpperCase();
    console.log(`Fetching klines for ${upperSymbol} (${interval}) from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
    
    const limit = 1500;

    try {
        await binance.loadMarkets();
        // Use CCXT's unified method to fetch OHLCV data
        const ohlcv = await binance.fetchOHLCV(upperSymbol, interval, startTime, limit);

        if (!Array.isArray(ohlcv)) {
            throw new Error('Unexpected data format from CCXT fetchOHLCV.');
        }

        // Map CCXT's array format [time, open, high, low, close, volume] to our HistoricalData object format
        return ohlcv.map((kline: number[]): HistoricalData => ({
            time: kline[0],
            open: kline[1],
            high: kline[2],
            low: kline[3],
            close: kline[4],
            volume: kline[5],
        }));

    } catch (error: any) {
        console.error(`Error fetching klines via CCXT:`, error);
        if (error instanceof ccxt.NetworkError) {
             throw new Error("Failed to connect to Binance. Please check your network connection.");
        } else if (error instanceof ccxt.ExchangeError) {
            throw new Error(`Binance Exchange Error: ${error.message}`);
        } else {
            throw new Error("An unexpected error occurred while fetching historical data.");
        }
    }
};

export const getLatestKlinesByLimit = async (
    symbol: string,
    interval: string,
    limit: number
): Promise<HistoricalData[]> => {
    if (!symbol) {
        console.error("getLatestKlinesByLimit was called without a symbol.");
        return [];
    }
    const upperSymbol = symbol.toUpperCase();
    console.log(`Fetching latest ${limit} klines for ${upperSymbol} (${interval})`);

    try {
        await binance.loadMarkets();
        // Use CCXT's unified method to fetch OHLCV data.
        // Providing 'undefined' for 'since' fetches the most recent candles.
        const ohlcv = await binance.fetchOHLCV(upperSymbol, interval, undefined, limit);

        if (!Array.isArray(ohlcv)) {
            throw new Error('Unexpected data format from CCXT fetchOHLCV.');
        }

        // Map CCXT's array format [time, open, high, low, close, volume] to our HistoricalData object format
        return ohlcv.map((kline: number[]): HistoricalData => ({
            time: kline[0],
            open: kline[1],
            high: kline[2],
            low: kline[3],
            close: kline[4],
            volume: kline[5],
        }));

    } catch (error: any) {
        console.error(`Error fetching latest klines via CCXT:`, error);
        if (error instanceof ccxt.NetworkError) {
             throw new Error("Failed to connect to Binance. Please check your network connection.");
        } else if (error instanceof ccxt.ExchangeError) {
            throw new Error(`Binance Exchange Error: ${error.message}`);
        } else {
            throw new Error("An unexpected error occurred while fetching historical data.");
        }
    }
}

export const get24hTickerStats = async (symbols: string[]): Promise<Record<string, Ticker>> => {
    if (symbols.length === 0) return {};
    console.log(`Fetching 24h ticker stats for ${symbols.length} symbols...`);
    try {
        const tickers = await binance.fetchTickers(symbols);
        return tickers;
    } catch (error: any) {
        console.error(`Error fetching tickers via CCXT:`, error);
        if (error instanceof ccxt.NetworkError) {
             throw new Error("Failed to connect to Binance. Please check your network connection.");
        } else if (error instanceof ccxt.ExchangeError) {
            // Some exchanges don't support fetchTickers for multiple symbols, or have other constraints.
            // Fallback to individual calls.
            if (error.message.includes('not support') || error.message.includes('of the same type')) {
                console.log('Batch fetchTickers failed, falling back to individual calls. Reason:', error.message);
                const tickersObject: Record<string, Ticker> = {};
                await Promise.all(symbols.map(async (symbol) => {
                    try {
                        const ticker = await binance.fetchTicker(symbol);
                        tickersObject[ticker.symbol] = ticker;
                    } catch (e) {
                        console.warn(`Could not fetch individual ticker for ${symbol}`, e);
                    }
                }));
                return tickersObject;
            }
            throw new Error(`Binance Exchange Error: ${error.message}`);
        } else {
            throw new Error("An unexpected error occurred while fetching ticker data.");
        }
    }
}

export const placeOrder = async (
  symbol: string, 
  side: OrderSide, 
  quantity: number, 
  apiKey: string, 
  secretKey: string
): Promise<OrderResult> => {
  console.log(`--- SIMULATING TRADE EXECUTION ---`);
  console.log(`- Profile: Active`);
  console.log(`- Timestamp: ${new Date().toISOString()}`);
  console.log(`- Symbol: ${symbol}`);
  console.log(`- Side: ${side}`);
  console.log(`- Quantity: ${quantity.toFixed(5)}`);
  console.log(`---------------------------------`);

  // In a real application, this would make an authenticated POST request to /fapi/v1/order
  // For this prototype, we'll just return a mock success response.
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  if (!apiKey || !secretKey) {
      throw new Error("API keys are not configured. Cannot place order.");
  }
  
  return {
    orderId: `mock_${Date.now()}`,
    symbol,
    side,
    quantity,
    price: 12345.67, // This would be the actual fill price in a real response
    timestamp: Date.now(),
  };
};

export const getDepthSnapshot = async (symbol: string): Promise<any> => {
    if (!symbol) {
        throw new Error("getDepthSnapshot was called without a symbol.");
    }
    const upperSymbol = symbol.toUpperCase();
    console.log(`Fetching depth snapshot for ${upperSymbol}`);
    const url = `${BINANCE_API_URL}/fapi/v1/depth?symbol=${upperSymbol}&limit=500`;

    try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Binance API Error: ${errorData.msg || `Failed to fetch depth for ${upperSymbol}`} (Code: ${errorData.code})`);
        }
        return await response.json();
    } catch (error: any) {
        console.error(`Error fetching depth snapshot from Binance API:`, error);
        throw new Error("Failed to connect to Binance for order book data.");
    }
}
