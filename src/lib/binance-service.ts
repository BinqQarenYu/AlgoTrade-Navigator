'use server';

import type { Portfolio, Position } from './types';
import crypto from 'crypto';

const BINANCE_API_URL = 'https://fapi.binance.com';

// This service now makes real API calls to Binance.
export const getAccountBalance = async (apiKey: string, secretKey: string): Promise<Portfolio> => {
  console.log("Fetching real account balance from Binance...");

  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;

  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(queryString)
    .digest('hex');

  const url = `${BINANCE_API_URL}/fapi/v2/account?${queryString}&signature=${signature}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Ensure fresh data
    });

    const data = await response.json();

    if (!response.ok) {
      // Binance API errors have 'code' and 'msg' properties
      throw new Error(`Binance API Error: ${data.msg || 'Failed to fetch account balance.'} (Code: ${data.code})`);
    }

    // The API returns these as strings, so we parse them.
    return {
      balance: parseFloat(data.totalWalletBalance),
      totalPnl: parseFloat(data.totalUnrealizedProfit),
      // Daily volume is not available from this endpoint.
      // A separate call to trade history would be needed to calculate it.
      dailyVolume: 0,
    };
  } catch (error: any) {
    console.error("Error fetching from Binance:", error);
    // Re-throw a more user-friendly error
    if (error.message.includes('Binance API Error')) {
      throw error;
    }
    throw new Error("Failed to connect to Binance. Please check your network connection and API keys.");
  }
};


export const getOpenPositions = async (apiKey: string, secretKey: string): Promise<Position[]> => {
  console.log("Fetching open positions from Binance...");

  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;

  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(queryString)
    .digest('hex');
  
  const url = `${BINANCE_API_URL}/fapi/v2/positionRisk?${queryString}&signature=${signature}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Binance API Error: ${data.msg || 'Failed to fetch open positions.'} (Code: ${data.code})`);
    }

    // Filter for positions with a non-zero amount and map to our type
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

  } catch (error: any) {
    console.error("Error fetching positions from Binance:", error);
    if (error.message.includes('Binance API Error')) {
      throw error;
    }
    throw new Error("Failed to connect to Binance. Please check your network connection and API keys.");
  }
};