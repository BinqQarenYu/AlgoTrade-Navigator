
'use server';
import type { FearAndGreedIndex } from './types';

const FEAR_GREED_API_URL = 'https://api.alternative.me/fng/?limit=1';

/**
 * Fetches the latest Fear & Greed Index value.
 * This index is market-wide and not specific to any single asset.
 * @returns The Fear & Greed Index data, or null if an error occurs.
 */
export const getFearAndGreedIndex = async (): Promise<FearAndGreedIndex | null> => {
    try {
        // The API is very simple and doesn't require keys.
        const response = await fetch(FEAR_GREED_API_URL, {
            method: 'GET',
            cache: 'no-store', // The index updates daily, so don't cache for long periods.
        });

        if (!response.ok) {
            console.error(`Fear & Greed API Error: ${response.statusText}`);
            return null;
        }

        const data = await response.json();

        // The API returns data in a specific nested structure.
        if (data && data.data && data.data.length > 0) {
            const indexData = data.data[0];
            return {
                value: parseInt(indexData.value, 10),
                valueClassification: indexData.value_classification,
            };
        }
        
        console.warn('Fear & Greed API returned unexpected data structure.');
        return null;

    } catch (error) {
        console.error('Failed to fetch Fear & Greed Index:', error);
        return null;
    }
};
