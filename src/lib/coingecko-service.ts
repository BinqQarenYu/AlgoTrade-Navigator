
'use server';

import type { CoinSentimentData, CoinDetails } from './types';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

// A simple map from our app's tickers to CoinGecko's coin IDs.
const TICKER_TO_CG_ID: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'SOL': 'solana',
    'BNB': 'binancecoin',
    'ADA': 'cardano',
    'XRP': 'ripple',
    'DOGE': 'dogecoin',
    // Added more to support the topAssets list
    'AVAX': 'avalanche-2',
    'DOT': 'polkadot',
    'LINK': 'chainlink',
    'MATIC': 'matic-network',
    'LTC': 'litecoin',
    'NEAR': 'near',
    'UNI': 'uniswap',
    'ATOM': 'cosmos',
    'ETC': 'ethereum-classic',
    'FIL': 'filecoin',
    'APT': 'aptos',
    'SUI': 'sui',
    'OP': 'optimism',
    'PEPE': 'pepe',
    'WIF': 'dogwifhat',
    'TON': 'the-open-network',
    'ORDI': 'ordinals',
    'WLD': 'worldcoin-wld',
    'ARB': 'arbitrum',
    'BONK': 'bonk',
};

export const getSentimentForTickers = async (
    tickers: string[], 
    apiKey?: string | null
): Promise<CoinSentimentData[]> => {
    
    const sentimentPromises = tickers.map(ticker => {
        const coinId = TICKER_TO_CG_ID[ticker.toUpperCase()];
        if (!coinId) return Promise.resolve(null);
        return getCoinData(coinId, apiKey);
    });

    const results = await Promise.all(sentimentPromises);
    return results.filter((r): r is CoinSentimentData => r !== null);
};

// Fetches detailed data for a single coin.
const getCoinData = async (
    coinId: string, 
    apiKey?: string | null
): Promise<CoinSentimentData | null> => {
    try {
        const url = new URL(`${COINGECKO_API_URL}/coins/${coinId}`);
        // CoinGecko API uses this header for Pro keys, or a query param for Demo keys.
        if (apiKey) {
            url.searchParams.append('x_cg_demo_api_key', apiKey);
        }
        // These params reduce the response size.
        url.searchParams.append('localization', 'false');
        url.searchParams.append('tickers', 'false');
        url.searchParams.append('market_data', 'false');
        url.searchParams.append('sparkline', 'false');
        
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store', // Don't cache sentiment data
        });

        if (!response.ok) {
            // CoinGecko has a rate limit on their free API.
            if (response.status === 429) {
                console.warn(`CoinGecko rate limit hit for ${coinId}.`);
            } else {
                console.error(`CoinGecko API Error for ${coinId}: ${response.statusText}`);
            }
            return null;
        }

        const data = await response.json();

        if (!data) return null;

        return {
            id: data.id,
            symbol: data.symbol,
            name: data.name,
            sentimentUp: data.sentiment_votes_up_percentage || 0,
            image: data.image?.thumb || '',
        };

    } catch (error) {
        console.error(`Failed to fetch CoinGecko data for ${coinId}:`, error);
        return null;
    }
};

export const getCoinDetailsByTicker = async (
    ticker: string, 
    apiKey?: string | null
): Promise<CoinDetails | null> => {
    const coinId = TICKER_TO_CG_ID[ticker.toUpperCase()];
    if (!coinId) return null;

    try {
        const url = new URL(`${COINGECKO_API_URL}/coins/${coinId}`);
        if (apiKey) {
            url.searchParams.append('x_cg_demo_api_key', apiKey);
        }
        url.searchParams.append('localization', 'false');
        url.searchParams.append('tickers', 'false');
        url.searchParams.append('market_data', 'true'); // Fetch market data now
        url.searchParams.append('sparkline', 'false');
        
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
        });

        if (!response.ok) {
            if (response.status === 429) {
                console.warn(`CoinGecko rate limit hit for ${coinId}.`);
            } else {
                console.error(`CoinGecko API Error for ${coinId}: ${response.statusText}`);
            }
            return null;
        }

        const data = await response.json();
        if (!data) return null;

        // Strip HTML tags from description
        const description = data.description?.en?.replace(/<[^>]*>?/gm, '') || null;
        const marketData = data.market_data;

        return {
            id: data.id,
            symbol: data.symbol,
            name: data.name,
            image: data.image?.thumb || '',
            sentimentUp: data.sentiment_votes_up_percentage || 0,
            description: description,
            marketCapRank: data.market_cap_rank || null,
            publicInterestScore: data.public_interest_score || 0,
            // New fields
            marketCap: marketData?.market_cap?.usd ?? 0,
            priceChange24h: marketData?.price_change_percentage_24h ?? 0,
            volume24h: marketData?.total_volume?.usd ?? 0,
            circulatingSupply: marketData?.circulating_supply ?? 0,
            totalSupply: marketData?.total_supply ?? null,
            ath: marketData?.ath?.usd ?? 0,
            athDate: marketData?.ath_date?.usd ? new Date(marketData.ath_date.usd).toLocaleDateString() : 'N/A',
            atl: marketData?.atl?.usd ?? 0,
            atlDate: marketData?.atl_date?.usd ? new Date(marketData.atl_date.usd).toLocaleDateString() : 'N/A',
        };

    } catch (error) {
        console.error(`Failed to fetch CoinGecko details for ${coinId}:`, error);
        return null;
    }
};
