'use server';

import type { MarketAnalysisRequest, AIAnalysisResult } from './ai-analysis-service';
import type { PoolAnalysisResult } from './liquidity-analysis-service';
import { getCoinDetailsByTicker } from './coingecko-service';

/**
 * server-actions - clean single implementations for:
 * - fetchMarketData
 * - analyzeMarketData
 * - analyzeLiquidityPools
 */

/** Simplified market data shape used by the app */
interface MarketData {
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  sentiment: string;
}

/** Minimal mapping from tickers to CoinGecko IDs (extend as needed) */
const TICKER_TO_CG_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  ADA: 'cardano',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  LINK: 'chainlink',
  MATIC: 'matic-network',
  LTC: 'litecoin',
  NEAR: 'near',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  ETC: 'ethereum-classic',
  FIL: 'filecoin',
  APT: 'aptos',
  SUI: 'sui',
  OP: 'optimism',
  PEPE: 'pepe',
  WIF: 'dogwifhat',
  TON: 'the-open-network',
  ORDI: 'ordinals',
  WLD: 'worldcoin-wld',
  ARB: 'arbitrum',
  BONK: 'bonk',
  LA: 'layerai',
};

/**
 * Fetch market data for a symbol - uses CoinGecko helpers where available
 */
export async function fetchMarketData(symbol: string): Promise<MarketData> {
  try {
    const upper = symbol.toUpperCase();
    const coinId = TICKER_TO_CG_ID[upper];

    const coinDetails = await getCoinDetailsByTicker(symbol);

    if (!coinDetails) {
      throw new Error(`No data found for ${symbol}`);
    }

    return {
      price: coinDetails.marketCap / (coinDetails.circulatingSupply || 1),
      priceChange24h: coinDetails.priceChange24h || 0,
      volume24h: coinDetails.volume24h || 0,
      marketCap: coinDetails.marketCap || 0,
      sentiment: (coinDetails.sentimentUp && coinDetails.sentimentUp > 50) ? 'Bullish' : 'Bearish',
    };
  } catch (error) {
    console.error('Error fetching market data:', error);
    // Fallback mock data
    return {
      price: 50000,
      priceChange24h: -0.5,
      volume24h: 1_000_000_000,
      marketCap: 1_000_000_000_000,
      sentiment: 'Neutral',
    };
  }
}

/**
 * Analyze market data using AI analysis service (delegates to ai-analysis-service)
 */
export async function analyzeMarketData(request: MarketAnalysisRequest): Promise<AIAnalysisResult> {
  // dynamic import to avoid client-side bundling of server-only code
  const { aiAnalysisService } = await import('./ai-analysis-service');
  return await aiAnalysisService.analyzeMarket(request);
}

/**
 * Analyze liquidity pools by delegating to the liquidity-analysis-service
 */
export async function analyzeLiquidityPools(symbol: string): Promise<PoolAnalysisResult> {
  const { liquidityAnalysisService } = await import('./liquidity-analysis-service');
  return await liquidityAnalysisService.analyzePoolSafety(symbol);
}