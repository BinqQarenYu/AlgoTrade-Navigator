'use server';

import type { Portfolio } from './types';
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
