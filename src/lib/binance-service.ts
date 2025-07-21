
'use server';

import type { Portfolio, Position, Trade, HistoricalData, OrderSide, OrderResult } from './types';
import type { Ticker } from 'ccxt';
import crypto from 'crypto';
import ccxt from 'ccxt';

const BINANCE_API_URL = 'https://fapi.binance.com';

// CCXT instance for public market data
const binance = new ccxt.binance({
    options: { defaultType: 'future' },
    enableRateLimit: true, // Enable built-in rate limiting
});
binance.loadMarkets(); // Pre-load markets

// Helper for authenticated Binance API calls (GET requests)
const callAuthenticatedGetApi = async <T>(path: string, queryString: string, apiKey: string, secretKey: string): Promise<{ data: T, usedWeight: number }> => {
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
    
    // Handle geo-blocking error specifically
    if (response.status === 451 || response.status === 403) {
      throw new Error("Service unavailable from your region. Binance has restricted access from the location of your app's server. (Code: 451/403)");
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Binance API Error: ${data.msg || `Failed to fetch from ${path}`} (Code: ${data.code})`);
    }
    return { data: data as T, usedWeight };
  } catch (error: any) {
    console.error(`Error fetching from Binance API (${path}):`, error);
    if (error.message.includes('Binance API Error') || error.message.includes('Service unavailable')) {
      throw error;
    }
    throw new Error("Failed to connect to Binance. Please check your network connection and API keys.");
  }
};


export const getAccountBalance = async (apiKey: string, secretKey: string): Promise<{ data: Portfolio, usedWeight: number }> => {
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const { data, usedWeight } = await callAuthenticatedGetApi<any>('/fapi/v2/account', queryString, apiKey, secretKey);

  const portfolioData = {
    balance: parseFloat(data.totalWalletBalance),
    totalPnl: parseFloat(data.totalUnrealizedProfit),
    dailyVolume: 0, // Not available from this endpoint
  };
  return { data: portfolioData, usedWeight };
};

export const getOpenPositions = async (apiKey: string, secretKey: string): Promise<{ data: Position[], usedWeight: number }> => {
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const { data, usedWeight } = await callAuthenticatedGetApi<any[]>('/fapi/v2/positionRisk', queryString, apiKey, secretKey);

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
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}&timestamp=${timestamp}&limit=50`;
    const { data, usedWeight } = await callAuthenticatedGetApi<any[]>(`/fapi/v1/userTrades`, queryString, apiKey, secretKey);

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
    // Add validation check for startTime and endTime
    if (typeof startTime !== 'number' || typeof endTime !== 'number' || isNaN(startTime) || isNaN(endTime)) {
        console.error(`getHistoricalKlines called with invalid time values for ${symbol}. startTime: ${startTime}, endTime: ${endTime}`);
        return [];
    }

    const upperSymbol = symbol.toUpperCase();
    
    const limit = 1500;

    try {
        await binance.loadMarkets(true); // Force cache bypass
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
        if (error.message.includes('451') || error.message.includes('restricted location')) {
             throw new Error("Service unavailable from your region. Binance has restricted access from the location of your app's server. (Code: 451/403)");
        }
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

    try {
        await binance.loadMarkets(true); // Force cache bypass
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
        if (error.message.includes('451') || error.message.includes('restricted location')) {
             throw new Error("Service unavailable from your region. Binance has restricted access from the location of your app's server. (Code: 451/403)");
        }
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
    try {
        const tickers = await binance.fetchTickers(symbols, { 'newUpdates': false });
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
  secretKey: string,
  reduceOnly: boolean = false
): Promise<OrderResult> => {
  if (!apiKey || !secretKey) {
      throw new Error("API keys are not configured. Cannot place order.");
  }
  
  await binance.loadMarkets(true); // Force a reload of market data to ensure precision is up-to-date
  const market = binance.market(symbol);
  
  if (!market) {
      throw new Error(`Could not find market data for symbol: ${symbol}`);
  }

  // Use ccxt's built-in precision handling
  const formattedQuantity = binance.amountToPrecision(symbol, quantity);

  const timestamp = Date.now();
  const params: any = {
    symbol,
    side,
    type: 'MARKET',
    quantity: formattedQuantity,
    timestamp,
  };
  
  if (reduceOnly) {
      params.reduceOnly = 'true';
  }

  const queryString = Object.keys(params)
    .map(key => `${key}=${params[key]}`)
    .join('&');

  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(queryString)
    .digest('hex');

  const url = `${BINANCE_API_URL}/fapi/v1/order?${queryString}&signature=${signature}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'X-MBX-APIKEY': apiKey, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    const responseData = await response.json();

    if (!response.ok) {
      // Handle geo-blocking error specifically
      if (response.status === 451 || response.status === 403) {
          throw new Error("Service unavailable from your region. Binance has restricted access from the location of your app's server. (Code: 451/403)");
      }
      // Handle a specific error for reduceOnly orders on non-existent positions
      if (responseData.code === -2022 && responseData.msg.includes('ReduceOnly Order is rejected')) {
        throw new Error(`Close order failed: No open position for ${symbol} on the specified side.`);
      }
      throw new Error(`Binance API Error: ${responseData.msg || 'Failed to place order'} (Code: ${responseData.code})`);
    }

    return {
      orderId: String(responseData.orderId),
      symbol: responseData.symbol,
      side: responseData.side,
      quantity: parseFloat(responseData.origQty),
      price: parseFloat(responseData.avgPrice || responseData.price), // Use avgPrice for market, price for limit
      timestamp: responseData.updateTime,
    };
  } catch (error: any) {
    console.error(`Error placing order on Binance:`, error);
    if (error.message.includes('Binance API Error') || error.message.includes('Close order failed') || error.message.includes('Service unavailable')) {
      throw error;
    }
    throw new Error("Failed to send order to Binance. Please check your network and API permissions.");
  }
};
