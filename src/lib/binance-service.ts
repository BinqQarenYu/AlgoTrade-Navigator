
'use client';

import type { Portfolio, Position, Trade, HistoricalData, OrderSide, OrderResult } from './types';
import type { Ticker, Exchange } from 'ccxt';
import Decimal from 'decimal.js';

// Helper for exponential backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// This function is now the single point of contact for all client-side requests to our proxy.
async function callProxy<T>(
    path: string, 
    method: 'GET' | 'POST' = 'GET', 
    body?: Record<string, any>,
    keys?: { apiKey: string, secretKey: string },
    useDirectConnection: boolean = false,
    timeoutMs: number = 20000,
    maxRetries: number = 3
): Promise<{ data: T, usedWeight: number }> {
    let attempt = 0;
    
    while (attempt < maxRetries) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const requestBody: any = { path, method, body };
            if (keys) {
                requestBody.apiKey = keys.apiKey;
                requestBody.secretKey = keys.secretKey;
            }

            const response = await fetch('/api/exchange-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const result = await response.json();

            if (!response.ok) {
                // Handle 429 Rate Limit Errors with Exponential Backoff + Jitter
                if (response.status === 429 || result.error?.includes('429')) {
                    const retryAfter = response.headers.get('Retry-After');
                    let waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
                    
                    // Add up to 500ms jitter to prevent thundering herd
                    waitTime += Math.random() * 500;
                    
                    console.warn(`[Binance 429 Limit] Rate limited on ${path}. Backing off for ${Math.round(waitTime)}ms (Attempt ${attempt + 1}/${maxRetries})`);
                    await sleep(waitTime);
                    attempt++;
                    continue; // Retry loop
                }

                if (result.error?.includes('restricted location')) {
                    throw new Error(result.error);
                }
                throw new Error(result.error || `Proxy Error: ${response.statusText}`);
            }
            return { data: result.data || result, usedWeight: result.usedWeight || 1 };
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.warn(`[Timeout] Request to ${path} timed out. Retrying...`);
                attempt++;
                continue;
            }
            console.error(`Error calling proxy for path ${path}:`, error);
            throw error; // If it's a structural error, don't retry, just throw.
        }
    }
    
    throw new Error(`Exceeded maximum retries (${maxRetries}) for Binance API path: ${path}. Check connection or rate limits.`);
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
  quantity: number | Decimal,
  keys: { apiKey: string, secretKey: string },
  reduceOnly: boolean = false,
  useDirectConnection: boolean = false
): Promise<OrderResult> => {
  
  const binanceExchange = await getBinanceExchange();
  const market = binanceExchange.market(symbol);
  if (!market) {
      throw new Error(`Could not find market data for symbol: ${symbol}`);
  }

  // Convert quantity through Decimal.js to prevent JS float leaking, then back to a safe exchange precision string
  const preciseQty = new Decimal(quantity).toNumber();
  const formattedQuantity = binanceExchange.amountToPrecision(symbol, preciseQty);
  
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
    if (!symbol) return [];
    
    try {
        // We use the proxy for klines too, to ensure we bypass geo-restrictions even for public data.
        const body = {
            symbol: symbol.toUpperCase(),
            interval,
            startTime,
            endTime,
            limit: 1500
        };

        const { data: ohlcv } = await callProxy<any[]>('/fapi/v1/klines', 'GET', body);
        
        if (!Array.isArray(ohlcv)) {
            throw new Error('Unexpected data format from Binance klines.');
        }
        
        return ohlcv.map((k: any): HistoricalData => ({
            time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
        }));
    } catch (error) {
        console.error(`Error fetching klines via Proxy:`, error);
        throw error;
    }
};

export const getLatestKlinesByLimit = async (
    symbol: string,
    interval: string,
    limit: number
): Promise<HistoricalData[]> => {
    if (!symbol) return [];
    
    try {
        const body = {
            symbol: symbol.toUpperCase(),
            interval,
            limit
        };

        const { data: ohlcv } = await callProxy<any[]>('/fapi/v1/klines', 'GET', body);
        
        if (!Array.isArray(ohlcv)) {
            throw new Error('Unexpected data format from Binance klines.');
        }
        
        return ohlcv.map((k: any): HistoricalData => ({
            time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
        }));
    } catch (error) {
        console.error(`Error fetching latest klines via Proxy:`, error);
        throw error;
    }
}

export const getOrderBook = async (
    symbol: string,
    limit: number = 100
): Promise<{ bids: [string, string][], asks: [string, string][] }> => {
    try {
        const { data } = await callProxy<any>('/fapi/v1/depth', 'GET', { symbol: symbol.toUpperCase(), limit });
        return data;
    } catch (error) {
        console.error(`Error fetching order book for ${symbol}:`, error);
        return { bids: [], asks: [] };
    }
};
