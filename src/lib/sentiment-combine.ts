// Returns the list of bearish meme coin tickers
export async function getBearishMemeCoins(cgApiKey?: string | null) {
  const coins = await getSentimentForTickers(MEME_TICKERS, cgApiKey);
  return coins
    .filter((coin: any) => coin && typeof coin.price_change_percentage_24h === 'number' && coin.price_change_percentage_24h < 0)
    .map((coin: any) => coin.symbol || coin.id || '');
}
// Define meme and altcoin tickers (can be expanded)
const MEME_TICKERS = [
  'DOGE', 'SHIB', 'PEPE', 'WIF', 'BONK', 'FLOKI', 'BABYDOGE', 'DOG', 'MEME', 'HOGE', 'ELON', 'CATE', 'SAMO', 'PIT', 'AKITA', 'KISHU', 'SAFEMOON', 'MONA', 'HUSKY', 'DOGIRA'
];
const ALTCOIN_TICKERS = [
  'ETH', 'BNB', 'ADA', 'SOL', 'XRP', 'AVAX', 'DOT', 'LINK', 'MATIC', 'LTC', 'NEAR', 'UNI', 'ATOM', 'ETC', 'FIL', 'APT', 'SUI', 'OP', 'TON', 'ORDI', 'WLD', 'ARB', 'LA'
];

import { getSentimentForTickers } from './coingecko-service';

// Returns { bullishCount, bearishCount, value } for a group of tickers
export async function getGroupSentiment(tickers: string[], cgApiKey?: string | null) {
  const coins = await getSentimentForTickers(tickers, cgApiKey);
  let bullishCount = 0;
  let bearishCount = 0;
  coins.forEach((coin: any) => {
    if (coin && typeof coin.price_change_percentage_24h === 'number') {
      if (coin.price_change_percentage_24h > 0) bullishCount++;
      else if (coin.price_change_percentage_24h < 0) bearishCount++;
    }
  });
  const value = (bullishCount + bearishCount) > 0 ? (bullishCount / (bullishCount + bearishCount)) * 100 : 50;
  return { bullishCount, bearishCount, value: Math.round(value) };
}

// Convenience functions for UI
export async function getMemeCoinSentiment(cgApiKey?: string | null) {
  return getGroupSentiment(MEME_TICKERS, cgApiKey);
}
export async function getAltCoinSentiment(cgApiKey?: string | null) {
  return getGroupSentiment(ALTCOIN_TICKERS, cgApiKey);
}
import { getFearAndGreedIndex } from './fear-greed-service';
import { getTopCoins } from './coingecko-service';
import { getCoinDetailsByTickerFromCMC } from './coinmarketcap-service';

export async function getOverallMarketSentiment(cgApiKey?: string | null) {
  try {
    const [fearAndGreed, topCoins] = await Promise.all([
      getFearAndGreedIndex(),
      getTopCoins(250, cgApiKey),
    ]);

    const fgValue = fearAndGreed?.value ?? 50; // Default to neutral

    let bullishCount = 0;
    let bearishCount = 0;

    if (topCoins && topCoins.length > 0) {
      topCoins.forEach((coin: any) => {
        if (coin.price_change_percentage_24h > 0) {
          bullishCount++;
        } else if (coin.price_change_percentage_24h < 0) {
          bearishCount++;
        }
      });
    }

    const marketSentiment = (bullishCount + bearishCount) > 0
      ? (bullishCount / (bullishCount + bearishCount)) * 100
      : 50; // Default to neutral if no data

    // Weighted average: 60% Fear & Greed, 40% market breadth
    const weightedAverage = (fgValue * 0.6) + (marketSentiment * 0.4);

    return {
      value: Math.round(Math.max(0, Math.min(100, weightedAverage))),
      bullishCount,
      bearishCount,
    };
  } catch (error) {
    console.error("Failed to get overall market sentiment:", error);
    return {
      value: 50, // Neutral fallback
      bullishCount: 0,
      bearishCount: 0,
    };
  }
}

// Fetches and combines sentiment from Binance, CoinMarketCap, and CoinGecko
export async function getCombinedSentiment(ticker: string, cmcApiKey?: string|null, cgApiKey?: string|null) {
  // CoinGecko
  let cgSentiment = 0;
  try {
    const coins = await getTopCoins(10, cgApiKey);
    const cg = coins.find((c: any) => c.symbol.toUpperCase() === ticker.toUpperCase());
    cgSentiment = cg?.sentimentUp ?? 0;
  } catch {}

  // CoinMarketCap
  let cmcSentiment = 0;
  try {
    if (cmcApiKey) {
      const cmc = await getCoinDetailsByTickerFromCMC(ticker, cmcApiKey);
      cmcSentiment = cmc?.publicInterestScore ?? 0;
    }
  } catch {}

  // Fear & Greed Index (as a proxy for Binance sentiment)
  let fg = await getFearAndGreedIndex();
  let binanceSentiment = fg ? fg.value : 50;

  // Normalize all to 0-100
  return {
    binance: binanceSentiment,
    coingecko: cgSentiment,
    coinmarketcap: cmcSentiment,
    average: Math.round((binanceSentiment + cgSentiment + cmcSentiment) / 3)
  };
}
