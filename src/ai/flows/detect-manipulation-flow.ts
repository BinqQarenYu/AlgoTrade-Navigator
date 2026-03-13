
'use server';
/**
 * @fileOverview An AI agent for detecting potential market manipulation patterns.
 *
 * - detectManipulation - A function that analyzes historical data for pump and dump schemes.
 * - DetectManipulationInput - The input type for the detectManipulation function.
 * - DetectManipulationOutput - The return type for the detectManipulation function.
 */

import {ai} from '@/ai/genkit';
import { runAiFlow } from '@/lib/ai-service';
import {z} from 'genkit';

const DetectManipulationInputSchema = z.object({
  symbol: z.string().describe('The trading symbol, e.g., BTCUSDT.'),
  historicalData: z
    .string()
    .describe(
      'A JSON string representing an array of recent k-line/candlestick data.'
    ),
  apiKey: z.string().optional().describe('Optional API key from user settings.'),
  marketDetails: z.record(z.any()).optional().describe('Consolidated asset details from CoinGecko/CoinMarketCap (market cap, supply, category, etc.).'),
  globalContext: z.record(z.any()).optional().describe('Global market context like Fear & Greed Index.'),
  model: z.string().optional().describe('The specific Gemini model to use.'),
});
export type DetectManipulationInput = z.infer<typeof DetectManipulationInputSchema>;

const PeriodSchema = z.object({
  startTime: z.number().describe('The start timestamp (milliseconds) of the phase.'),
  endTime: z.number().describe('The end timestamp (milliseconds) of the phase.'),
});

const DetectManipulationOutputSchema = z.object({
  isManipulationSuspected: z.boolean().describe('Whether a pump and dump pattern is strongly suspected.'),
  confidence: z.number().min(0).max(1).describe('The confidence level of the suspicion (0 to 1).'),
  currentPhase: z.enum(['Accumulation', 'Pump', 'Distribution', 'None']).describe('The most likely current phase if a pattern is active or recently completed.'),
  reasoning: z.string().describe("A detailed explanation of the findings, referencing the three phases, and a clear recommendation on the best course of action (e.g., 'Avoid this asset due to high manipulation risk')."),
  accumulationPeriod: PeriodSchema.optional().describe('The identified accumulation phase period. This is the quiet period before the pump.'),
  pumpPeriod: PeriodSchema.optional().describe('The identified pump phase period. This is the period of explosive price and volume increase.'),
  distributionPeriod: PeriodSchema.optional().describe('The identified distribution (dump) phase period. This is the high-volume topping and subsequent crash.'),
});
export type DetectManipulationOutput = z.infer<typeof DetectManipulationOutputSchema>;

const detectManipulationPrompt = ai.definePrompt({
  name: 'detectManipulationPrompt',
  input: {schema: DetectManipulationInputSchema},
  output: {schema: DetectManipulationOutputSchema},
  prompt: `You are a forensic market analyst specializing in detecting deceptive trading patterns and "Pump and Dump" schemes. You synthesize technical data with fundamental market properties to identify high-risk environments.

**Analysis Subject:** {{{symbol}}}

**1. Institutional & Market Context:**
{{#if marketDetails}}
- Market Cap: \${{{marketDetails.marketCap}}}
- 24h Volume: \${{{marketDetails.volume24h}}}
- Circulating Supply: {{{marketDetails.circulatingSupply}}}
- FDV: \${{{marketDetails.fdv}}}
- Sector: {{{marketDetails.categories}}}
{{else}}
- Consolidated fundamental data unavailable.
{{/if}}

**2. Global Market Environment:**
{{#if globalContext}}
- Fear & Greed Index: {{{globalContext.value}}} ({{{globalContext.valueClassification}}})
{{/if}}

**3. Forensic Task:**
Analyze the provided k-line data to identify the lifecycle of a potential manipulation scheme:
1. **Accumulation**: Boring, low-volume, sideways action.
2. **Pump**: Explosive, parabolic price increase on vertical volume spikes.
3. **Distribution/Dump**: High-volume stall (rug pull preparation) followed by a crash.

**Professional Nuance:**
- **Low-Float Risk**: If Circulating Supply is a small fraction of FDV, or if Market Cap is low, the risk of manipulation is significantly higher. 
- **Volume Correlation**: Is the volume spike proportional to the asset's normal 24h turnover (from CMC/CG data)? If a single 'pump' candle represents 20% of the usual daily volume, it is highly suspicious.
- **Sentiment Divergence**: If the asset is pumping while global sentiment is in "Extreme Fear", it might be an isolated manipulation event rather than organic growth.

**Historical Data (Last 30 periods):**
\`\`\`json
{{{historicalData}}}
\`\`\`

**Your Objective:**
1. **Identify Phases**: Map the price/volume action to the Accumulation/Pump/Distribution phases.
2. **Suspicion Level**: Set \`isManipulationSuspected\` based on structural anomalies.
3. **Forensic Deep-Dive**: Provide a detailed analytical breakdown. Look for "Wash Trading" (high volume with no price movement) or "Painting the Tape" (slow, artificial price climbing on low volume).
4. **Best Action Guidance**: Provide a clinical instruction. If manipulation is suspected, detail the safest exit or avoidance strategy. If organic, detail the confirmation level needed.

Be suspicious. Your goal is to keep the trader from becoming "exit liquidity."

Generate the output in the required JSON format.
`,
});

const detectManipulationFlow = ai.defineFlow(
  {
    name: 'detectManipulationFlow',
    inputSchema: DetectManipulationInputSchema,
    outputSchema: DetectManipulationOutputSchema,
  },
  async input => runAiFlow(detectManipulationPrompt, input)
);

export async function detectManipulation(input: DetectManipulationInput): Promise<DetectManipulationOutput> {
  return detectManipulationFlow(input);
}
