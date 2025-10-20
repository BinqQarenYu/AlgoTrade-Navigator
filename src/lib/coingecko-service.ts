
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
    'LA': 'layerai'
};

/**
 * Fetches a list of top coins by market cap.
 * @param limit The number of coins to fetch.
 * @param apiKey Optional CoinGecko API key.
 * @returns A promise that resolves to an array of coin data.
 */
export const getTopCoins = async (
    limit: number = 100,
    apiKey?: string | null
): Promise<any[]> => {
    try {
        const url = new URL(`${COINGECKO_API_URL}/coins/markets`);
        url.searchParams.append('vs_currency', 'usd');
        url.searchParams.append('order', 'market_cap_desc');
        url.searchParams.append('per_page', String(limit));
        url.searchParams.append('page', '1');
        url.searchParams.append('sparkline', 'false');
        url.searchParams.append('price_change_percentage', '7d');

        if (apiKey) {
            url.searchParams.append('x_cg_demo_api_key', apiKey);
        }
        
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            console.error(`CoinGecko API Error (markets): ${errorData.message || response.statusText}`);
            throw new Error('Failed to fetch top coins from CoinGecko.');
        }

        const data = await response.json();

        // Now, we need genesis_date for each coin, which is not in the /markets endpoint.
        // We'll have to make individual calls for that. This is inefficient but necessary for the prototype.
        const detailedDataPromises = data.map(async (coin: any) => {
            try {
                const detailUrl = new URL(`${COINGECKO_API_URL}/coins/${coin.id}`);
                 if (apiKey) {
                    detailUrl.searchParams.append('x_cg_demo_api_key', apiKey);
                }
                detailUrl.searchParams.append('localization', 'false');
                detailUrl.searchParams.append('tickers', 'false');
                detailUrl.searchParams.append('market_data', 'false');
                detailUrl.searchParams.append('developer_data', 'false');
                detailUrl.searchParams.append('sparkline', 'false');

                const detailResponse = await fetch(detailUrl.toString(), { cache: 'no-store' });
                if (!detailResponse.ok) return { ...coin, genesis_date: null }; // Return original data if detail fails
                
                const detailData = await detailResponse.json();
                
                return {
                    ...coin,
                    genesis_date: detailData.genesis_date || null,
                };
            } catch (e) {
                console.warn(`Could not fetch details for ${coin.id}`, e);
                return { ...coin, genesis_date: null }; // Return original data on error
            }
        });

        const detailedResults = await Promise.all(detailedDataPromises);

        return detailedResults;
        
    } catch (error) {
        console.error('Failed to fetch top coins from CoinGecko:', error);
        return [];
    }
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
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                console.error(`CoinGecko API Error for ${coinId}: ${errorData.message || response.statusText}`);
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
                 const errorData = await response.json().catch(() => ({ message: response.statusText }));
                console.error(`CoinGecko API Error for ${coinId}: ${errorData.message || response.statusText}`);
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

/**
 * Get simple price data for a coin
 */
export const getCoinPrice = async (
    coinId: string,
    apiKey?: string | null
): Promise<{ price: number; change24h: number; volume24h: number } | null> => {
    try {
        const url = new URL(`${COINGECKO_API_URL}/simple/price`);
        url.searchParams.append('ids', coinId);
        url.searchParams.append('vs_currencies', 'usd');
        url.searchParams.append('include_24hr_change', 'true');
        url.searchParams.append('include_24hr_vol', 'true');

        if (apiKey) {
            url.searchParams.append('x_cg_demo_api_key', apiKey);
        }

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error(`CoinGecko price API error: ${response.statusText}`);
        }

        const data = await response.json();
        const coinData = data[coinId];
        
        if (!coinData) {
            return null;
        }

        return {
            price: coinData.usd || 0,
            change24h: coinData.usd_24h_change || 0,
            volume24h: coinData.usd_24h_vol || 0
        };
    } catch (error) {
        console.error(`Failed to fetch price for ${coinId}:`, error);
        return null;
    }
};
