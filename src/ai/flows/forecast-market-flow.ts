
'use server';
/**
 * @fileOverview An AI agent for market forecasting using quantum-inspired principles.
 * 
 * - forecastMarket - A function that generates a probabilistic forecast for an asset.
 * - ForecastMarketInput - The input type for the forecastMarket function.
 * - QuantumPredictionSummary - The return type for the forecastMarket function (defined in types.ts).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { QuantumPredictionSummary } from '@/lib/types';
import { runAiFlow } from '@/lib/ai-service';

const ForecastMarketInputSchema = z.object({
  symbol: z.string().describe('The trading symbol, e.g., BTCUSDT.'),
  interval: z.string().describe('The time interval of the data, e.g., "1h".'),
  historicalData: z
    .string()
    .describe(
      'A JSON string representing an array of recent k-line/candlestick data (OHLCV).'
    ),
  buySideTarget: z.number().optional().describe('The price of the key buy-side liquidity target (resistance).'),
  sellSideTarget: z.number().optional().describe('The price of the key sell-side liquidity target (support).'),
});
export type ForecastMarketInput = z.infer<typeof ForecastMarketInputSchema>;

// The output schema must match the QuantumPredictionSummary type from src/lib/types.ts
const ForecastMarketOutputSchema = z.object({
  trend: z.enum(['BULLISH', 'BEARISH', 'RANGING']).describe("The AI's assessment of the most probable market trend over the forecast period."),
  targetPrice: z.number().describe("The AI's single most probable price target at the end of the forecast period (the mean of the probability distribution)."),
  confidence: z.number().min(0).max(1).describe("The AI's confidence in this forecast, from 0 (no confidence) to 1 (high confidence)."),
  sigma: z.number().describe("The predicted standard deviation (σ) of the price distribution. A higher sigma indicates greater uncertainty and expected volatility."),
  range: z.object({
    min: z.number().describe("The lower bound of the 1-sigma probability range (targetPrice - sigma)."),
    max: z.number().describe("The upper bound of the 1-sigma probability range (targetPrice + sigma)."),
  }).describe("The price range within which the asset is expected to trade with ~68% probability."),
  reasoning: z.string().describe("A concise explanation of the factors (volatility, trend, recent patterns) that led to this forecast."),
});

const forecastMarketPrompt = ai.definePrompt({
    name: 'forecastMarketPrompt',
    input: { schema: ForecastMarketInputSchema },
    output: { schema: ForecastMarketOutputSchema },
    prompt: `You are a Quantitative Analyst specializing in quantum-inspired market modeling. Your task is to analyze historical price data for {{{symbol}}} on the {{{interval}}} timeframe and generate a probabilistic forecast for the next 7 periods.

**Your analysis must produce a probability distribution of future prices, summarized by the following parameters:**
- **trend**: The overall directional bias (BULLISH, BEARISH, RANGING).
- **targetPrice**: The mean (μ) of your predicted price distribution. This is the most likely price point.
- **sigma (σ)**: The standard deviation of your predicted price distribution. This represents the expected volatility and uncertainty. A higher sigma means a wider, less certain range of outcomes.
- **range**: The price range defined by (targetPrice - sigma) and (targetPrice + sigma).
- **confidence**: Your confidence in the forecast's accuracy.
- **reasoning**: A brief explanation of your analysis.

**Market Context: The Liquidity Zone**
The current playing field for the market is defined by the following liquidity targets. The price is expected to move within this zone to trigger pending orders. Your primary task is to predict where within this zone the price will resolve.
- **Buy-Side Liquidity (Resistance):** {{{buySideTarget}}}
- **Sell-Side Liquidity (Support):** {{{sellSideTarget}}}

**Historical Data:**
\`\`\`json
{{{historicalData}}}
\`\`\`

Analyze the provided data, considering recent trends, volatility (expansion/contraction), and any significant price patterns. Based on this, determine the most likely ` + "`targetPrice`" + ` **within the provided Liquidity Zone**. Then calculate the expected ` + "`sigma`" + ` (volatility/uncertainty) for the forecast. Set the ` + "`trend`" + ` based on whether the target price is closer to the buy-side or sell-side target. Calculate the 1-sigma ` + "`range`" + ` and provide your ` + "`confidence`" + ` and ` + "`reasoning`" + `.
`,
});

const forecastMarketFlow = ai.defineFlow(
  {
    name: 'forecastMarketFlow',
    inputSchema: ForecastMarketInputSchema,
    outputSchema: ForecastMarketOutputSchema,
  },
  async input => runAiFlow(forecastMarketPrompt, input)
);

export async function forecastMarket(input: ForecastMarketInput): Promise<QuantumPredictionSummary> {
  return forecastMarketFlow(input);
}
