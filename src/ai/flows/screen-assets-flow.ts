
'use server';
/**
 * @fileOverview An AI agent for screening crypto assets based on user criteria.
 * 
 * - screenAssets - A function that fetches market data and uses an AI to rank assets.
 * - ScreenAssetsInput - The input type for the screenAssets function.
 * - ScreenAssetsOutput - The return type for the screenAssets function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getTopCoins } from '@/lib/coingecko-service';

const CriteriaSchema = z.object({
  minMarketCap: z.number(),
  maxMarketCap: z.number(),
  minVolume24h: z.number(),
  maxVolume24h: z.number(),
  volatilityPreference: z.enum(['low', 'medium', 'high', 'any']),
  agePreference: z.enum(['any', 'new', 'established']),
  performancePreference: z.enum(['strong_7d', 'weak_7d', 'any']),
});

export const ScreenAssetsInputSchema = z.object({
  criteria: CriteriaSchema,
  coingeckoApiKey: z.string().nullable(),
});
export type ScreenAssetsInput = z.infer<typeof ScreenAssetsInputSchema>;

const RankedAssetSchema = z.object({
  rank: z.number().int().min(1).describe('The rank of the asset, where 1 is the best match.'),
  id: z.string().describe("The original ID of the asset (e.g., 'bitcoin')."),
  name: z.string().describe("The name of the asset (e.g., 'Bitcoin')."),
  symbol: z.string().toUpperCase().describe("The symbol of the asset (e.g., 'BTC')."),
  marketCap: z.number().describe("The market capitalization of the asset."),
  performance7d: z.number().describe("The 7-day performance percentage."),
  imageUrl: z.string().url().describe('The URL of the asset\'s image/logo.'),
  justification: z.string().describe('A concise, expert justification for why this asset was ranked here, based on the user\'s criteria.'),
});

export const ScreenAssetsOutputSchema = z.object({
  assets: z.array(RankedAssetSchema),
});
export type ScreenAssetsOutput = z.infer<typeof ScreenAssetsOutputSchema>;


const screenerPrompt = ai.definePrompt({
    name: 'assetScreenerPrompt',
    input: { schema: z.object({ criteria: CriteriaSchema, assetsJson: z.string() }) },
    output: { schema: ScreenAssetsOutputSchema },
    prompt: `You are a professional crypto asset analyst at a top-tier quantitative hedge fund. Your task is to analyze a list of crypto assets and rank the top 10 that best match the user's specified criteria.

**User's Criteria:**
- Market Cap: Between \${{{criteria.minMarketCap}}} and \${{{criteria.maxMarketCap}}}
- 24h Volume: Between \${{{criteria.minVolume24h}}} and \${{{criteria.maxVolume24h}}}
- Volatility Preference: {{{criteria.volatility}}}
- Asset Age Preference: {{{criteria.agePreference}}} (Note: a 'new' asset is less than 3 months old, based on its 'genesis_date')
- 7d Performance Preference: {{{criteria.performancePreference}}}

**Analysis Instructions:**
1.  **Filter:** First, filter the provided list of assets to only include those that strictly meet the market cap and volume criteria.
2.  **Evaluate & Rank:** From the filtered list, evaluate the assets based on the user's qualitative preferences (volatility, age, performance). Combine these factors to create a ranked list of the TOP 10 best matches.
3.  **Provide Justification:** For each of the top 10 assets, provide a concise, expert-level justification for its rank. The justification should directly reference the user's criteria. For example, "Ranks highly due to its strong 7-day performance and medium volatility, fitting the user's profile for a trending asset." or "A good match for its established status and low volatility, despite a weaker 7d trend."

**Asset Data (JSON format):**
\`\`\`json
{{{assetsJson}}}
\`\`\`

Provide your final ranked list in the required JSON format.
`,
});

async function screenAssetsFlow(input: ScreenAssetsInput): Promise<ScreenAssetsOutput> {
    console.log("Fetching top 250 coins for screening...");
    const allCoins = await getTopCoins(250, input.coingeckoApiKey);
    if (!allCoins || allCoins.length === 0) {
        throw new Error("Could not fetch asset data from CoinGecko.");
    }
    
    // Filter out assets with null genesis_date for age calculations and map to simplified object
    const filteredAssets = allCoins
      .filter(coin => coin.genesis_date !== null && coin.total_volume && coin.market_cap && coin.price_change_percentage_7d_in_currency)
      .map(coin => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        market_cap: coin.market_cap,
        total_volume: coin.total_volume,
        price_change_percentage_7d: coin.price_change_percentage_7d_in_currency,
        image: coin.image,
        genesis_date: coin.genesis_date,
      }));

    console.log(`Analyzing ${filteredAssets.length} assets with the AI model...`);

    const { output } = await screenerPrompt({
        criteria: input.criteria,
        assetsJson: JSON.stringify(filteredAssets),
    });

    if (!output) {
        throw new Error("The AI model did not return a valid response.");
    }
    return output;
}

export const screenAssets = ai.defineFlow(
  {
    name: 'screenAssetsFlow',
    inputSchema: ScreenAssetsInputSchema,
    outputSchema: ScreenAssetsOutputSchema,
  },
  screenAssetsFlow
);

    