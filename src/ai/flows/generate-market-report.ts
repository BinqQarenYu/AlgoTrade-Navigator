
'use server';

/**
 * @fileOverview An AI agent for generating detailed market analysis reports.
 *
 * - generateMarketReport - A function that analyzes market data and produces a report.
 * - GenerateMarketReportInput - The input type for the generateMarketReport function.
 * - GenerateMarketReportOutput - The return type for the generateMarketReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMarketReportInputSchema = z.object({
  symbol: z.string().describe('The trading symbol, e.g., BTCUSDT.'),
  interval: z.string().describe('The time interval of the data, e.g., "1h".'),
  historicalData: z
    .string()
    .describe(
      'A JSON string representing an array of recent k-line/candlestick data.'
    ),
});
export type GenerateMarketReportInput = z.infer<typeof GenerateMarketReportInputSchema>;

const GenerateMarketReportOutputSchema = z.object({
    title: z.string().describe('A concise title for the market report.'),
    summary: z.string().describe('A brief, high-level summary of the market conditions.'),
    trendAnalysis: z.string().describe('A detailed analysis of the current market trend (uptrend, downtrend, consolidation), referencing key price action and moving averages if possible.'),
    volatilityAnalysis: z.string().describe('An analysis of the market volatility, noting any recent expansion or contraction.'),
    keyLevels: z.string().describe('Identification of key support and resistance levels based on recent price action.'),
    outlook: z.string().describe("A forward-looking outlook on potential market scenarios and a clear recommendation for the best course of action (e.g., 'Look for long entries on dips', 'Wait for a clear breakout before trading')."),
});
export type GenerateMarketReportOutput = z.infer<typeof GenerateMarketReportOutputSchema>;

export async function generateMarketReport(input: GenerateMarketReportInput): Promise<GenerateMarketReportOutput> {
  return generateMarketReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMarketReportPrompt',
  input: {schema: GenerateMarketReportInputSchema},
  output: {schema: GenerateMarketReportOutputSchema},
  prompt: `You are a senior quantitative analyst at a hedge fund. Your task is to write a professional, data-driven market report for the asset: {{{symbol}}} on the {{{interval}}} timeframe.

Analyze the provided historical data to formulate your report. Be objective and base your analysis solely on the data given.

**Historical Data:**
\`\`\`json
{{{historicalData}}}
\`\`\`

**Instructions:**
Generate a comprehensive report covering the following sections:
1.  **Summary:** A brief overview of the key takeaways.
2.  **Trend Analysis:** Is the asset in an uptrend, downtrend, or consolidating? What is the evidence from price action?
3.  **Volatility Analysis:** Is volatility increasing or decreasing? Are there signs of a potential breakout or a quiet period?
4.  **Key Levels:** Identify the most significant recent support and resistance levels.
5.  **Outlook:** Based on all the above, what are the likely scenarios for the asset in the near future? Conclude with a clear recommendation for the best course of action for a trader.

Provide your analysis in the structured JSON format required.
`,
});

const generateMarketReportFlow = ai.defineFlow(
  {
    name: 'generateMarketReportFlow',
    inputSchema: GenerateMarketReportInputSchema,
    outputSchema: GenerateMarketReportOutputSchema,
  },
  async input => {
    const maxRetries = 3;
    let lastError: Error | null = null;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const { output } = await prompt(input);
        if (!output) {
            throw new Error("The AI model did not return a valid response. This could be due to safety filters or an internal error.");
        }
        return output;
      } catch (e: any) {
        lastError = e;
        // Check for non-retriable quota errors first
        if (e.message && e.message.includes('429')) {
          console.error("AI quota exceeded. Not retrying.", e);
          throw new Error("You have exceeded your daily AI quota. Please check your plan and billing details.");
        }
        // Check for common transient errors
        if (e.message && (e.message.includes('503') || e.message.includes('overloaded'))) {
          console.log(`Attempt ${i + 1} failed with a transient error. Retrying in ${Math.pow(2, i)}s...`);
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        } else {
          // It's a different, non-retriable error
          throw e;
        }
      }
    }
    // If all retries failed
    throw new Error("The AI service is currently overloaded. Please try again in a few minutes.");
  }
);
