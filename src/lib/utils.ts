
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
  if (price >= 10) {
    // For prices like BTC, ETH
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 0.1) {
    // For prices like ADA, XRP
    return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
  // For low-value assets like SHIB, PEPE
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}
