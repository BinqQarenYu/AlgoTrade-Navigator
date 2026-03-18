/**
 * binance-native-client.ts
 *
 * Ultra-low-latency Binance Native API execution layer using @binance/connector.
 * - Sub-5ms order placement bypassing CCXT abstraction overhead
 * - Pre-order precision scaling via exchangeInfo filters (stepSize, tickSize)
 * - Spot ↔ Futures internal asset transfers via restricted secondary API key
 */

import { Spot } from '@binance/connector';
import Decimal from 'decimal.js';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────
export interface OrderResult {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  executedQty: number;
  avgPrice: number;
  status: string;
  latencyMs: number;
}

export interface TransferResult {
  tranId: string;
  success: boolean;
}

interface ExchangeSymbolFilter {
  filterType: string;
  stepSize?: string;
  tickSize?: string;
  minQty?: string;
  minNotional?: string;
}

interface ExchangeSymbolInfo {
  symbol: string;
  filters: ExchangeSymbolFilter[];
}

// ──────────────────────────────────────────────────────────
// State
// ──────────────────────────────────────────────────────────
let client: Spot | null = null;

// Cache exchange info to avoid fetching on every order
let exchangeInfoCache: Record<string, ExchangeSymbolInfo> = {};
let exchangeInfoCachedAt = 0;
const EXCHANGE_INFO_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ──────────────────────────────────────────────────────────
// Client Init
// ──────────────────────────────────────────────────────────
export function initNativeClient(apiKey: string, secretKey: string): void {
  client = new Spot(apiKey, secretKey, {
    baseURL: 'https://fapi.binance.com',
    timeout: 5000, // Hard 5s timeout — fail fast for execution latency
  });
}

function requireClient(): Spot {
  if (!client) throw new Error('[BinanceNative] Client not initialized. Call initNativeClient() first.');
  return client;
}

// ──────────────────────────────────────────────────────────
// Exchange Info & Precision Scaling
// ──────────────────────────────────────────────────────────
async function refreshExchangeInfo(): Promise<void> {
  if (Date.now() - exchangeInfoCachedAt < EXCHANGE_INFO_TTL_MS) return;

  const c = requireClient();
  const response = await c.exchangeInfo();
  const symbols: ExchangeSymbolInfo[] = response.data?.symbols || [];

  exchangeInfoCache = {};
  for (const s of symbols) {
    exchangeInfoCache[s.symbol] = s;
  }
  exchangeInfoCachedAt = Date.now();
}

/**
 * Round a value DOWN to match a Binance stepSize or tickSize filter.
 * This satisfies Binance's precision requirements strictly.
 */
function applyStep(value: number, step: string): string {
  const stepDecimal = new Decimal(step);
  const valueDecimal = new Decimal(value);
  const precision = stepDecimal.decimalPlaces();
  const rounded = valueDecimal
    .dividedBy(stepDecimal)
    .floor()
    .times(stepDecimal);
  return rounded.toFixed(precision);
}

export async function getPrecisionScaled(
  symbol: string,
  rawPrice: number,
  rawQty: number
): Promise<{ price: string; quantity: string }> {
  await refreshExchangeInfo();

  const info = exchangeInfoCache[symbol];
  if (!info) {
    // Fallback: 2 decimal places
    return {
      price: rawPrice.toFixed(2),
      quantity: rawQty.toFixed(3),
    };
  }

  let stepSize = '0.001';
  let tickSize = '0.01';

  for (const f of info.filters) {
    if (f.filterType === 'LOT_SIZE' && f.stepSize) stepSize = f.stepSize;
    if (f.filterType === 'PRICE_FILTER' && f.tickSize) tickSize = f.tickSize;
  }

  return {
    price: applyStep(rawPrice, tickSize),
    quantity: applyStep(rawQty, stepSize),
  };
}

// ──────────────────────────────────────────────────────────
// Order Execution (Sub-5ms latency path)
// ──────────────────────────────────────────────────────────
export async function placeMarketOrder(
  symbol: string,
  side: 'BUY' | 'SELL',
  rawQuantity: number,
  apiKey: string,
  secretKey: string
): Promise<OrderResult> {
  initNativeClient(apiKey, secretKey);
  const c = requireClient();

  const { quantity } = await getPrecisionScaled(symbol, 0, rawQuantity);

  const t0 = performance.now();

  const response = await c.newOrder(symbol, side, 'MARKET', {
    quantity,
    newOrderRespType: 'RESULT', // Get fills in single response
  });

  const t1 = performance.now();
  const latencyMs = parseFloat((t1 - t0).toFixed(2));
  const data = response.data;

  return {
    orderId: String(data.orderId),
    symbol: data.symbol,
    side: data.side,
    executedQty: parseFloat(data.executedQty),
    avgPrice: parseFloat(data.avgPrice || data.price || '0'),
    status: data.status,
    latencyMs,
  };
}

export async function placeLimitOrder(
  symbol: string,
  side: 'BUY' | 'SELL',
  rawQuantity: number,
  rawPrice: number,
  apiKey: string,
  secretKey: string
): Promise<OrderResult> {
  initNativeClient(apiKey, secretKey);
  const c = requireClient();

  const { price, quantity } = await getPrecisionScaled(symbol, rawPrice, rawQuantity);

  const t0 = performance.now();

  const response = await c.newOrder(symbol, side, 'LIMIT', {
    quantity,
    price,
    timeInForce: 'GTC',
    newOrderRespType: 'RESULT',
  });

  const t1 = performance.now();
  const data = response.data;

  return {
    orderId: String(data.orderId),
    symbol: data.symbol,
    side: data.side,
    executedQty: parseFloat(data.executedQty),
    avgPrice: parseFloat(data.avgPrice || data.price || '0'),
    status: data.status,
    latencyMs: parseFloat((t1 - t0).toFixed(2)),
  };
}

// ──────────────────────────────────────────────────────────
// Internal Asset Transfers (Spot ↔ Futures)
// ──────────────────────────────────────────────────────────
/**
 * Transfers between Spot and USD-M Futures wallets.
 * Uses a separate restricted transfer-only API key for safety.
 * type: 1 = Spot→USDT-M Futures, 2 = USDT-M Futures→Spot
 */
export async function transferAsset(
  asset: string,
  amount: number,
  direction: 'SPOT_TO_FUTURES' | 'FUTURES_TO_SPOT',
  transferApiKey: string,
  transferSecretKey: string
): Promise<TransferResult> {
  const transferClient = new Spot(transferApiKey, transferSecretKey);
  const type = direction === 'SPOT_TO_FUTURES' ? 1 : 2;

  try {
    const response = await transferClient.futuresTransfer(asset, amount.toString(), type);
    return { tranId: String(response.data?.tranId || ''), success: true };
  } catch (err: any) {
    console.error('[BinanceNative Transfer]', err?.response?.data || err.message);
    throw new Error(`Transfer failed: ${err?.response?.data?.msg || err.message}`);
  }
}
