
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
        url.searchParams.append('market_data', 'false');
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

        return {
            id: data.id,
            symbol: data.symbol,
            name: data.name,
            image: data.image?.thumb || '',
            sentimentUp: data.sentiment_votes_up_percentage || 0,
            description: description,
            marketCapRank: data.market_cap_rank || null,
            publicInterestScore: data.public_interest_score || 0,
        };

    } catch (error) {
        console.error(`Failed to fetch CoinGecko details for ${coinId}:`, error);
        return null;
    }
};
