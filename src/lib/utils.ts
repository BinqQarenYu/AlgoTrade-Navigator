
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a price with appropriate precision based on its value.
 * @param price The price to format.
 * @returns A formatted string representation of the price.
 */
import { getMarkets } from './binance-service';
import type { Market } from 'ccxt';

// A cache for price precisions to avoid re-calculating
const precisionCache = new Map<string, number>();

/**
 * Determines the number of decimal places to display for a given symbol's price.
 * It fetches market data on the first call and caches it for subsequent requests.
 * @param symbol The trading symbol (e.g., 'BTC/USDT').
 * @param markets The loaded markets from ccxt.
 * @returns The number of decimal places for the price.
 */
export const getPricePrecision = (symbol: string, markets: Record<string, Market> | null): number => {
    if (precisionCache.has(symbol)) {
        return precisionCache.get(symbol)!;
    }

    if (markets && markets[symbol]) {
        const precision = markets[symbol].precision?.price;
        if (precision) {
             // CCXT's `precision` is the number of decimal places, which is what we need.
            precisionCache.set(symbol, precision);
            return precision;
        }
    }

    // Fallback logic if market data is not available or doesn't contain precision
    // This is based on the general price level of the asset.
    console.warn(`No precision data for ${symbol}, using fallback logic.`);
    if (!markets || !markets[symbol] || !markets[symbol].info) {
        // This logic is a guesstimate and should be used as a last resort.
        // A better approach would be to have a default from a config file.
        return 2;
    }

    const lastPrice = markets[symbol].info?.lastPrice;
    if (lastPrice) {
        const price = parseFloat(lastPrice);
        if (price > 1000) return 2;
        if (price > 10) return 4;
        if (price > 0.1) return 5;
        if (price > 0.0001) return 8;
        return 10;
    }

    return 2; // Default fallback
};


/**
 * Formats a price with appropriate precision based on its value.
 * @param price The price to format.
 * @param precision The number of decimal places.
 * @returns A formatted string representation of the price.
 */
export function formatPrice(price: number, precision?: number): string {
  if (price === 0) return '0.00';
  
  const finalPrecision = precision ?? 2;

  // Use toLocaleString for larger numbers for comma separators, but toFixed for small ones for accuracy.
  if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: finalPrecision, maximumFractionDigits: finalPrecision });
  } else {
    return price.toFixed(finalPrecision);
  }
}


/**
 * Formats a large number into a human-readable string with metric prefixes (K, M, B, T).
 * @param num The number to format.
 * @param digits The number of decimal places to use.
 * @returns A formatted string (e.g., 1.23M).
 */
export function formatLargeNumber(num: number, digits = 2): string {
  if (num === null || num === undefined || num === 0) return "0";
  if (num < 1000) return num.toString();

  const si = [
    { value: 1, symbol: "" },
    { value: 1E3, symbol: "K" },
    { value: 1E6, symbol: "M" },
    { value: 1E9, symbol: "B" },
    { value: 1E12, symbol: "T" },
    { value: 1E15, symbol: "P" },
    { value: 1E18, symbol: "E" }
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  let i;
  for (i = si.length - 1; i > 0; i--) {
    if (num >= si[i].value) {
      break;
    }
  }
  return (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
}

export const intervalToMs = (interval: string): number => {
    const value = parseInt(interval.slice(0, -1), 10);
    const unit = interval.slice(-1);

    if (isNaN(value)) return 60000; // Default to 1 minute on error

    switch (unit) {
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 60000;
    }
}
