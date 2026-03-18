
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

let cachedExchangeInfo: any = null;

export const initExchangeInfo = async (useDirectConnection: boolean = false): Promise<any> => {
    try {
        if (cachedExchangeInfo) return cachedExchangeInfo;
        const { data } = await callProxy('/fapi/v1/exchangeInfo', 'GET', undefined, undefined, useDirectConnection);
        cachedExchangeInfo = data;
        return data;
    } catch (error) {
        console.error('[BINANCE API] initExchangeInfo error:', error);
        throw error;
    }
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

  // Fetch exchange info at startup (or fallback inline) to apply stepSize precision bounding
  let exchangeInfo = cachedExchangeInfo;
  if (!exchangeInfo) {
      exchangeInfo = await initExchangeInfo(useDirectConnection);
  }

  const symbolInfo = exchangeInfo?.symbols?.find((s: any) => s.symbol === symbol);
  let boundedQuantity = quantity;

  if (symbolInfo) {
      const lotSizeFilter = symbolInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE');
      if (lotSizeFilter && lotSizeFilter.stepSize) {
          const stepSize = parseFloat(lotSizeFilter.stepSize);
          boundedQuantity = Number(new Decimal(quantity).dividedToIntegerBy(stepSize).times(stepSize));
      }
  }

  // Convert bounded quantity through Decimal.js to prevent JS float leaking, then back to a safe exchange precision string
  const preciseQty = new Decimal(boundedQuantity).toNumber();
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

// Public data fetching natively uses CCXT to avoid proxy rate limits.
export const getHistoricalKlines = async (
    symbol: string, 
    interval: string, 
    startTime: number, 
    endTime: number
): Promise<HistoricalData[]> => {
    if (!symbol) return [];
    
    try {
        const binanceExchange = await getBinanceExchange();
        // Use CCXT's unified method to fetch OHLCV data
        const ohlcv = await binanceExchange.fetchOHLCV(symbol.toUpperCase(), interval, startTime, 1500);
        
        if (!Array.isArray(ohlcv)) {
            throw new Error('Unexpected data format from CCXT fetchOHLCV.');
        }
        
        return ohlcv.map((k: any): HistoricalData => ({
            time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
        }));
    } catch (error) {
        console.error(`Error fetching klines via CCXT:`, error);
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
        const binanceExchange = await getBinanceExchange();
        const ohlcv = await binanceExchange.fetchOHLCV(symbol.toUpperCase(), interval, undefined, limit);
        
        if (!Array.isArray(ohlcv)) {
            throw new Error('Unexpected data format from CCXT fetchOHLCV.');
        }
        
        return ohlcv.map((k: any): HistoricalData => ({
            time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
        }));
    } catch (error) {
        console.error(`Error fetching latest klines via CCXT:`, error);
        throw error;
    }
}

export const getOrderBook = async (
    symbol: string,
    limit: number = 100
): Promise<{ bids: [string, string][], asks: [string, string][] }> => {
    try {
        const binanceExchange = await getBinanceExchange();
        const orderbook = await binanceExchange.fetchOrderBook(symbol.toUpperCase(), limit);
        return {
            bids: (orderbook.bids || []).map(b => [(b[0] ?? 0).toString(), (b[1] ?? 0).toString()]),
            asks: (orderbook.asks || []).map(a => [(a[0] ?? 0).toString(), (a[1] ?? 0).toString()]),
        };
    } catch (error) {
        console.error(`Error fetching order book for ${symbol} via CCXT:`, error);
        return { bids: [], asks: [] };
    }
};

export const getRecentTrades = async (
    symbol: string,
    limit: number = 100
): Promise<any[]> => {
    try {
        const binanceExchange = await getBinanceExchange();
        const trades = await binanceExchange.fetchTrades(symbol.toUpperCase(), undefined, limit);
        // Map CCXT trade format to mimic original Binance REST payload format
        return trades.map((t: any) => ({
            id: t.id || t.info?.id || Date.now().toString(),
            price: t.price?.toString() || '0',
            qty: t.amount?.toString() || '0',
            time: t.timestamp,
            // CCXT translates side directly to 'buy' or 'sell' for taker
            isBuyerMaker: t.side === 'sell'
        }));
    } catch (error) {
        console.error(`Error fetching recent trades for ${symbol} via CCXT:`, error);
        return [];
    }
};

export const transferSpotToFutures = async (
    keys: { apiKey: string, secretKey: string },
    asset: string,
    amount: number,
    useDirectConnection: boolean = false
): Promise<any> => {
    try {
        const body = {
            asset,
            amount: amount.toString(),
            type: 1 // 1: spot to USDT-M futures
        };
        const { data } = await callProxy('/sapi/v1/asset/transfer', 'POST', body, keys, useDirectConnection);
        return data;
    } catch (error) {
        console.error('[BINANCE API] transferSpotToFutures error:', error);
        throw error;
    }
};
