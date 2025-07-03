
'use server';

import type { Portfolio, Position, Trade, HistoricalData } from './types';
import crypto from 'crypto';

const BINANCE_API_URL = 'https://fapi.binance.com';

// Helper for authenticated Binance API calls
const callAuthenticatedApi = async <T>(path: string, queryString: string, apiKey: string, secretKey: string): Promise<T> => {
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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Binance API Error: ${data.msg || `Failed to fetch from ${path}`} (Code: ${data.code})`);
    }
    return data as T;
  } catch (error: any) {
    console.error(`Error fetching from Binance API (${path}):`, error);
    if (error.message.includes('Binance API Error')) {
      throw error;
    }
    throw new Error("Failed to connect to Binance. Please check your network connection and API keys.");
  }
};


export const getAccountBalance = async (apiKey: string, secretKey: string): Promise<Portfolio> => {
  console.log("Fetching real account balance from Binance...");
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const data = await callAuthenticatedApi<any>('/fapi/v2/account', queryString, apiKey, secretKey);

  return {
    balance: parseFloat(data.totalWalletBalance),
    totalPnl: parseFloat(data.totalUnrealizedProfit),
    dailyVolume: 0, // Not available from this endpoint
  };
};

export const getOpenPositions = async (apiKey: string, secretKey: string): Promise<Position[]> => {
  console.log("Fetching open positions from Binance...");
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const data = await callAuthenticatedApi<any[]>('/fapi/v2/positionRisk', queryString, apiKey, secretKey);

  return data
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
};

export const getTradeHistory = async (symbol: string, apiKey: string, secretKey: string): Promise<Trade[]> => {
    console.log(`Fetching trade history for ${symbol} from Binance...`);
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}&timestamp=${timestamp}&limit=50`;
    const data = await callAuthenticatedApi<any[]>(`/fapi/v1/userTrades`, queryString, apiKey, secretKey);

    return data.map((trade: any): Trade => ({
        id: String(trade.id),
        symbol: trade.symbol,
        side: trade.isBuyer ? 'BUY' : 'SELL',
        size: parseFloat(trade.qty),
        price: parseFloat(trade.price),
        time: new Date(trade.time).toLocaleString(),
        timestamp: trade.time,
    }));
};

// Public endpoint, no authentication needed
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
    const queryString = `symbol=${upperSymbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=1500`;
    const url = `${BINANCE_API_URL}/fapi/v1/klines?${queryString}`;
    
     try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) {
             throw new Error(`Binance API Error: ${data.msg || `Failed to fetch from /fapi/v1/klines`} (Code: ${data.code})`);
        }

        if (!Array.isArray(data)) {
            throw new Error('Unexpected data format from Binance klines API.');
        }

        return data.map((kline: any[]): HistoricalData => ({
            time: kline[0],
            open: parseFloat(kline[1]),
            high: parseFloat(kline[2]),
            low: parseFloat(kline[3]),
            close: parseFloat(kline[4]),
            volume: parseFloat(kline[5]),
        }));

    } catch (error: any) {
        console.error(`Error fetching klines from Binance API:`, error);
        if (error.message.includes('Binance API Error')) {
            throw error;
        }
        throw new Error("Failed to connect to Binance. Please check your network connection.");
    }
};

    
