
'use client';

import type { Portfolio, Position, Trade, HistoricalData, OrderSide, OrderResult } from './types';
import type { Ticker, Exchange } from 'ccxt';

// This function is now the single point of contact for all client-side requests to our proxy.
async function callProxy<T>(
    path: string, 
    method: 'GET' | 'POST' = 'GET', 
    body?: Record<string, any>,
    keys?: { apiKey: string, secretKey: string },
    useDirectConnection: boolean = false,
    timeoutMs: number = 20000
): Promise<{ data: T, usedWeight: number }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const requestBody: any = { path, method, body };
        if (keys) {
            requestBody.apiKey = keys.apiKey;
            requestBody.secretKey = keys.secretKey;
        }

        const response = await fetch('/api/binance-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const result = await response.json();

        if (!response.ok) {
            // Handle specific geo-blocking errors coming from our proxy
            if (result.error?.includes('restricted location')) {
                throw new Error(result.error);
            }
            throw new Error(result.error || `Proxy Error: ${response.statusText}`);
        }
        return result;
    } catch (error) {
        console.error(`Error calling proxy for path ${path}:`, error);
        // Re-throw the error so it can be caught by the calling function and displayed in the UI
        throw error;
    }
}


// Lazy CCXT initialization to avoid blocking main thread on load
let binanceExchangeInstance: Exchange | null = null;
const getBinanceExchange = async () => {
    if (!binanceExchangeInstance) {
        const { binance } = await import('ccxt');
        binanceExchangeInstance = new binance({
            options: { defaultType: 'future' },
            enableRateLimit: true, 
        });
    }
    return binanceExchangeInstance;
};

export const pingBinance = async (keys: { apiKey: string, secretKey: string }, useDirectConnection: boolean = false): Promise<boolean> => {
    try {
        await callProxy<any>('/fapi/v1/ping', 'GET', undefined, keys, useDirectConnection, 5000);
        return true;
    } catch (error) {
        return false;
    }
};

export const getAccountBalance = async (
    keys: { apiKey: string, secretKey: string }, 
    useDirectConnection: boolean = false
): Promise<{ data: Portfolio, usedWeight: number }> => {
  const { data, usedWeight } = await callProxy<any>('/fapi/v2/account', 'GET', undefined, keys, useDirectConnection);
  const portfolioData = {
    balance: parseFloat(data.totalWalletBalance),
    totalPnl: parseFloat(data.totalUnrealizedProfit),
    dailyVolume: 0, // Not available from this endpoint
  };
  return { data: portfolioData, usedWeight };
};

export const getOpenPositions = async (
    keys: { apiKey: string, secretKey: string },
    useDirectConnection: boolean = false
): Promise<{ data: Position[], usedWeight: number }> => {
  const { data, usedWeight } = await callProxy<any[]>('/fapi/v2/positionRisk', 'GET', undefined, keys, useDirectConnection);
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

export const placeOrder = async (
  symbol: string, 
  side: OrderSide, 
  quantity: number,
  keys: { apiKey: string, secretKey: string },
  reduceOnly: boolean = false,
  useDirectConnection: boolean = false
): Promise<OrderResult> => {
  
  const binanceExchange = await getBinanceExchange();
  const market = binanceExchange.market(symbol);
  if (!market) {
      throw new Error(`Could not find market data for symbol: ${symbol}`);
  }

  const formattedQuantity = binanceExchange.amountToPrecision(symbol, quantity);
  
  const body: any = {
    symbol,
    side,
    type: 'MARKET',
    quantity: formattedQuantity,
  };
  
  if (reduceOnly) {
      body.reduceOnly = 'true';
  }

  const { data: responseData } = await callProxy<any>('/fapi/v1/order', 'POST', body, keys, useDirectConnection);

  return {
    orderId: String(responseData.orderId),
    symbol: responseData.symbol,
    side: responseData.side,
    quantity: parseFloat(responseData.origQty),
    price: parseFloat(responseData.avgPrice || responseData.price),
    timestamp: responseData.updateTime,
  };
};

// Public data fetching can still use CCXT directly, as it doesn't require API keys.
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
    if (typeof startTime !== 'number' || typeof endTime !== 'number' || isNaN(startTime) || isNaN(endTime)) {
        console.error(`getHistoricalKlines called with invalid time values for ${symbol}. startTime: ${startTime}, endTime: ${endTime}`);
        return [];
    }

    try {
        const binanceExchange = await getBinanceExchange();
        const ohlcv = await binanceExchange.fetchOHLCV(symbol.toUpperCase(), interval, startTime, 1500);
        if (!Array.isArray(ohlcv)) {
            throw new Error('Unexpected data format from CCXT fetchOHLCV.');
        }
        return ohlcv.map((k: any): HistoricalData => ({
            time: k[0], open: k[1], high: k[2], low: k[3], close: k[4], volume: k[5],
        }));
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error fetching klines via CCXT:`, error);
        if (errorMessage.includes('451') || errorMessage.includes('restricted location')) {
             throw new Error("Service unavailable from your region. Binance has restricted access from the location of your app's server. (Code: 451/403)");
        }
        if (error.name === 'NetworkError') {
             throw new Error("Failed to connect to Binance. Please check your network connection.");
        } else if (error instanceof binance.ExchangeError) {
            throw new Error(`Binance Exchange Error: ${errorMessage}`);
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
    try {
        const binanceExchange = await getBinanceExchange();
        const ohlcv = await binanceExchange.fetchOHLCV(symbol.toUpperCase(), interval, undefined, limit);
        if (!Array.isArray(ohlcv)) {
            throw new Error('Unexpected data format from CCXT fetchOHLCV.');
        }
        return ohlcv.map((k: any): HistoricalData => ({
            time: k[0], open: k[1], high: k[2], low: k[3], close: k[4], volume: k[5],
        }));
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error fetching latest klines via CCXT:`, error);
        if (errorMessage.includes('451') || errorMessage.includes('restricted location')) {
             throw new Error("Service unavailable from your region. Binance has restricted access from the location of your app's server. (Code: 451/403)");
        }
        if (error.name === 'NetworkError') {
             throw new Error("Failed to connect to Binance. Please check your network connection.");
        } else if (error instanceof binance.ExchangeError) {
            throw new Error(`Binance Exchange Error: ${errorMessage}`);
        } else {
            throw new Error("An unexpected error occurred while fetching historical data.");
        }
    }
}
