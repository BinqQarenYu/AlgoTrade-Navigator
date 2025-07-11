
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
  
  let precision: number;
  if (price > 1000) { // e.g. BTC
    precision = 2;
  } else if (price > 10) { // e.g. SOL
    precision = 4;
  } else if (price > 0.1) { // e.g. ADA
    precision = 5;
  } else if (price > 0.0001) { // e.g. SHIB
    precision = 8;
  } else { // e.g. PEPE
    precision = 10;
  }

  // Use toLocaleString for larger numbers for comma separators, but toFixed for small ones for accuracy.
  if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: precision, maximumFractionDigits: precision });
  } else {
    return price.toFixed(precision);
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

export const intervalToMs = (interval?: string): number => {
    if (!interval) return 0; // Safeguard against undefined input
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
