
'use client';

import type { Portfolio, Position, Trade, HistoricalData, OrderSide, OrderResult } from './types';
import type { Ticker } from 'ccxt';
// Import only the specific exchange class we need
import { binance } from 'ccxt';

// This function is now the single point of contact for all client-side requests to our proxy.
async function callProxy<T>(
    path: string, 
    method: 'GET' | 'POST' = 'GET', 
    body?: Record<string, any>,
    keys?: { apiKey: string, secretKey: string }
): Promise<{ data: T, usedWeight: number }> {
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
        });

        const result = await response.json();

        if (!response.ok) {
            // Handle specific geo-blocking errors coming from our proxy
            if (result.error?.includes('restricted location')) {
                throw new Error(result.error);
            }
            throw new Error(result.error || `Proxy Error: ${response.statusText}`);
        }
        return result;
    } catch (error: any) {
        console.error(`Error calling proxy for path ${path}:`, error);
        // Re-throw the error so it can be caught by the calling function and displayed in the UI
        throw error;
    }
}


// CCXT instance for public market data - this does not go through our proxy
const binanceExchange = new binance({
    options: { defaultType: 'future' },
    enableRateLimit: true, 
});

// Centralized precision formatting using CCXT's loaded market data
const formatToPrecision = (symbol: string, value: number, type: 'price' | 'amount'): string => {
    // Ensure markets are loaded before trying to use them
    if (Object.keys(binanceExchange.markets).length === 0) {
        // This is a fallback. In a real app, you'd want a more robust
        // way to ensure markets are loaded, perhaps during an init phase.
        console.warn("CCXT markets not loaded, using default precision.");
        return String(value);
    }
    if (type === 'price') {
        return binanceExchange.priceToPrecision(symbol, value);
    }
    return binanceExchange.amountToPrecision(symbol, value);
}

export const getAccountBalance = async (keys: { apiKey: string, secretKey: string }): Promise<{ data: Portfolio, usedWeight: number }> => {
  const { data, usedWeight } = await callProxy<any>('/fapi/v2/account', 'GET', undefined, keys);
  const portfolioData = {
    balance: parseFloat(data.totalWalletBalance),
    totalPnl: parseFloat(data.totalUnrealizedProfit),
    dailyVolume: 0, // Not available from this endpoint
  };
  return { data: portfolioData, usedWeight };
};

export const getOpenPositions = async (keys: { apiKey: string, secretKey: string }): Promise<{ data: Position[], usedWeight: number }> => {
  const { data, usedWeight } = await callProxy<any[]>('/fapi/v2/positionRisk', 'GET', undefined, keys);
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

export const setLeverage = async (
  symbol: string,
  leverage: number,
  keys: { apiKey: string, secretKey: string }
): Promise<any> => {
  const body = {
    symbol,
    leverage,
  };
  const { data } = await callProxy<any>('/fapi/v1/leverage', 'POST', body, keys);
  return data;
}

export const placeOrder = async (
  symbol: string, 
  side: OrderSide, 
  quantity: number,
  keys: { apiKey: string, secretKey: string },
  reduceOnly: boolean = false
): Promise<OrderResult> => {
  
  // Load markets if they haven't been loaded yet.
  if (Object.keys(binanceExchange.markets).length === 0) {
    await binanceExchange.loadMarkets();
  }
  
  const market = binanceExchange.market(symbol);
  if (!market) {
      throw new Error(`Could not find market data for symbol: ${symbol}`);
  }

  const formattedQuantity = formatToPrecision(symbol, quantity, 'amount');
  
  const body: any = {
    symbol,
    side,
    type: 'MARKET',
    quantity: formattedQuantity,
  };
  
  if (reduceOnly) {
      body.reduceOnly = 'true';
  }

  const { data: responseData } = await callProxy<any>('/fapi/v1/order', 'POST', body, keys);

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
        const ohlcv = await binanceExchange.fetchOHLCV(symbol.toUpperCase(), interval, startTime, 1500);
        if (!Array.isArray(ohlcv)) {
            throw new Error('Unexpected data format from CCXT fetchOHLCV.');
        }
        return ohlcv.map((k: number[]): HistoricalData => ({
            time: k[0], open: k[1], high: k[2], low: k[3], close: k[4], volume: k[5],
        }));
    } catch (error: any) {
        console.error(`Error fetching klines via CCXT:`, error);
        if (error.message.includes('451') || error.message.includes('restricted location')) {
             throw new Error("Service unavailable from your region. Binance has restricted access from the location of your app's server. (Code: 451/403)");
        }
        if (error instanceof binance.NetworkError) {
             throw new Error("Failed to connect to Binance. Please check your network connection.");
        } else if (error instanceof binance.ExchangeError) {
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
    try {
        const ohlcv = await binanceExchange.fetchOHLCV(symbol.toUpperCase(), interval, undefined, limit);
        if (!Array.isArray(ohlcv)) {
            throw new Error('Unexpected data format from CCXT fetchOHLCV.');
        }
        return ohlcv.map((k: number[]): HistoricalData => ({
            time: k[0], open: k[1], high: k[2], low: k[3], close: k[4], volume: k[5],
        }));
    } catch (error: any) {
        console.error(`Error fetching latest klines via CCXT:`, error);
        if (error.message.includes('451') || error.message.includes('restricted location')) {
             throw new Error("Service unavailable from your region. Binance has restricted access from the location of your app's server. (Code: 451/403)");
        }
        if (error instanceof binance.NetworkError) {
             throw new Error("Failed to connect to Binance. Please check your network connection.");
        } else if (error instanceof binance.ExchangeError) {
            throw new Error(`Binance Exchange Error: ${error.message}`);
        } else {
            throw new Error("An unexpected error occurred while fetching historical data.");
        }
    }
}
