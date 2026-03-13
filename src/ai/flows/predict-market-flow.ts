
'use server';

/**
 * @fileOverview An AI agent for market prediction.
 *
 * - predictMarket - A function that handles the market prediction process.
 * - PredictMarketInput - The input type for the predictMarket function.
 * - PredictMarketOutput - The return type for the predictMarket function.
 */

import {ai} from '@/ai/genkit';
import { runAiFlow } from '@/lib/ai-service';
import {z} from 'genkit';

const PredictMarketInputSchema = z.object({
  symbol: z.string().describe('The trading symbol, e.g., BTCUSDT.'),
  recentData: z
    .string()
    .describe(
      'A JSON string representing an array of recent k-line/candlestick data.'
    ),
  strategySignal: z
    .enum(['BUY', 'SELL', 'HOLD'])
    .optional()
    .describe(
      'A signal from a classic technical indicator. The AI should validate this signal.'
    ),
  apiKey: z.string().optional().describe('Optional API key from user settings.'),
  marketDetails: z.record(z.any()).optional().describe('Consolidated asset details from CoinGecko/CoinMarketCap (market cap, supply, category, etc.).'),
  globalContext: z.record(z.any()).optional().describe('Global market context like Fear & Greed Index.'),
  model: z.string().optional().describe('The specific Gemini model to use.'),
});
export type PredictMarketInput = z.infer<typeof PredictMarketInputSchema>;

const PredictionDetailSchema = z.object({
  prediction: z.enum(['UP', 'DOWN', 'NEUTRAL']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  recommendation: z.string(),
});

const PredictMarketOutputSchema = z.object({
  aggressive: PredictionDetailSchema.describe('High-risk, short-term scalping strategy (1-5 periods). Focus on momentum and liquidity traps.'),
  conservative: PredictionDetailSchema.describe('Lower-risk, mid-to-long term trend following (12-48 periods). Focus on fundamentals and established levels.'),
  institutionalBias: z.string().describe('A single-sentence summary of where the "Big Money" is likely leaning based on MC/Volume.'),
});
export type PredictMarketOutput = z.infer<typeof PredictMarketOutputSchema>;

const predictMarketPrompt = ai.definePrompt({
  name: 'predictMarketPrompt',
  input: {schema: PredictMarketInputSchema},
  output: {schema: PredictMarketOutputSchema},
  prompt: `You are a Tier-1 Quantitative Strategist at a major crypto hedge fund. Your mission is to provide two distinct, actionable strategies for {{{symbol}}} based on a synthesized view of Technicals, Fundamentals, and Sentiment.

**Market Context:**
- Asset: {{{symbol}}}
{{#if marketDetails}}
- Fundamental Data: MC \${{{marketDetails.marketCap}}}, 24h Vol \${{{marketDetails.volume24h}}}, Supply Ratio {{{marketDetails.circulatingSupply}}}
{{/if}}
{{#if globalContext}}
- Global Sentiment: {{{globalContext.value}}} ({{{globalContext.valueClassification}}})
{{/if}}

**Recent Candle Data (30p):**
{{{recentData}}}

**Instructions for Analysis:**
1. **The Aggressive Perspective (The Scalper):**
   - Focus on the immediate 1-5 candles. 
   - Look for momentum, RSI divergences, and liquidity spikes. 
   - Is there a "grab" happening? Can we front-run a move?
   - Be bold but precise.

2. **The Conservative Perspective (The Trend Follower):**
   - Look at the larger structure over the next 12-48 candles.
   - Use Market Cap and Volume to determine if the trend is sustainable. 
   - Is Global Sentiment (Fear/Greed) supportive of this asset class right now?
   - Focus on capital preservation and high-probability entries.

3. **Institutional Bias:**
   - Detect if "Whales" are likely accumulating or distributing based on the Volume/MarketCap turnover.

**Required JSON Structure:**
Return an object with:
- \`aggressive\`: {prediction, confidence, reasoning, recommendation}
- \`conservative\`: {prediction, confidence, reasoning, recommendation}
- \`institutionalBias\`: string

Be clinical, logical, and decisive. Avoid generic advice.
`,
});

const predictMarketFlow = ai.defineFlow(
  {
    name: 'predictMarketFlow',
    inputSchema: PredictMarketInputSchema,
    outputSchema: PredictMarketOutputSchema,
  },
  async input => runAiFlow(predictMarketPrompt, input)
);

export async function predictMarket(input: PredictMarketInput): Promise<PredictMarketOutput> {
  return predictMarketFlow(input);
}
