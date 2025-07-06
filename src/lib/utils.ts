
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
export function formatPrice(price: number): string {
  if (price === 0) return '0.00';
  if (price >= 1000) { // e.g. BTC
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 1) { // e.g. ETH, SOL, BNB
    return price.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  }
  if (price >= 0.01) { // e.g. ADA, XRP, DOGE
    return price.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
  }
  // For low-value assets like SHIB, PEPE
  return price.toLocaleString('en-US', { minimumFractionDigits: 8, maximumFractionDigits: 8 });
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
