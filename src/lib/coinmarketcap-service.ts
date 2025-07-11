
'use server';

import type { CoinDetails } from './types';

const COINMARKETCAP_API_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency';

// A more robust implementation might require multiple API calls to different endpoints (e.g., /info for metadata).
export const getCoinDetailsByTickerFromCMC = async (
    ticker: string, 
    apiKey: string
): Promise<CoinDetails | null> => {
    if (!ticker || !apiKey) return null;

    const upperTicker = ticker.toUpperCase();

    try {
        // First, get the main quote data
        const quoteUrl = new URL(`${COINMARKETCAP_API_URL}/quotes/latest`);
        quoteUrl.searchParams.append('symbol', upperTicker);
        
        const quoteResponse = await fetch(quoteUrl.toString(), {
            method: 'GET',
            headers: { 'X-CMC_PRO_API_KEY': apiKey, 'Accept': 'application/json' },
            cache: 'no-store',
        });

        const quoteResult = await quoteResponse.json();

        if (!quoteResponse.ok) {
            console.error(`CoinMarketCap API Error (Quotes): ${quoteResult.status?.error_message || quoteResponse.statusText}`);
            return null;
        }

        const data = quoteResult.data?.[upperTicker];
        if (!data) {
            console.warn(`No data for ${upperTicker} in CoinMarketCap response.`);
            return null;
        }

        const quote = data.quote?.USD;
        if (!quote) {
            console.warn(`No USD quote for ${upperTicker} in CoinMarketCap response.`);
            return null;
        }

        // Now, get metadata like logo and description
        const infoUrl = new URL(`${COINMARKETCAP_API_URL}/info`);
        infoUrl.searchParams.append('symbol', upperTicker);

        const infoResponse = await fetch(infoUrl.toString(), {
             method: 'GET',
            headers: { 'X-CMC_PRO_API_KEY': apiKey, 'Accept': 'application/json' },
            cache: 'no-store', // Metadata doesn't change often, but let's keep it fresh for now
        });
        
        let logo = '';
        let description = `Details from CoinMarketCap for ${data.name}. Full description not available in this API call.`;
        if (infoResponse.ok) {
            const infoResult = await infoResponse.json();
            const infoData = infoResult.data?.[upperTicker];
            if (infoData) {
                logo = infoData.logo || '';
                description = infoData.description || description;
            }
        } else {
            console.warn(`Could not fetch metadata for ${upperTicker} from CoinMarketCap.`);
        }

        // Map the combined data to our existing CoinDetails type.
        // Removed fields not available from CMC (sentimentUp, publicInterestScore)
        const details: CoinDetails = {
            id: String(data.id),
            symbol: data.symbol,
            name: data.name,
            image: logo,
            description: description,
            marketCapRank: data.cmc_rank || null,
            marketCap: quote.market_cap ?? 0,
            priceChange24h: quote.percent_change_24h ?? 0,
            volume24h: quote.volume_24h ?? 0,
            circulatingSupply: data.circulating_supply ?? 0,
            totalSupply: data.total_supply ?? null,
            ath: quote.ath ?? 0, 
            athDate: quote.ath_date ? new Date(quote.ath_date).toLocaleDateString() : 'N/A',
            atl: quote.atl ?? 0,
            atlDate: quote.atl_date ? new Date(quote.atl_date).toLocaleDateString() : 'N/A',
        };

        return details;

    } catch (error) {
        console.error(`Failed to fetch CoinMarketCap data for ${ticker}:`, error);
        return null;
    }
};
