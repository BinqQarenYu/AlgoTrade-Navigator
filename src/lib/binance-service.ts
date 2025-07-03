
'use server';

import type { Portfolio, Position, Trade, HistoricalData } from './types';
import crypto from 'crypto';
import ccxt from 'ccxt';

const BINANCE_API_URL = 'https://fapi.binance.com';

// CCXT instance for public market data (no API keys needed here)
const binance = new ccxt.binance({
    options: { defaultType: 'future' },
});

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
