
'use server';

/**
 * @fileOverview An AI agent for market prediction.
 *
 * - predictMarket - A function that handles the market prediction process.
 * - PredictMarketInput - The input type for the predictMarket function.
 * - PredictMarketOutput - The return type for the predictMarket function.
 */

import {ai} from '@/ai/genkit';
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
});
export type PredictMarketInput = z.infer<typeof PredictMarketInputSchema>;

const PredictMarketOutputSchema = z.object({
  prediction: z
    .enum(['UP', 'DOWN', 'NEUTRAL'])
    .describe('The predicted market direction.'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('The confidence level of the prediction, from 0 to 1.'),
  reasoning: z
    .string()
    .describe(
      'A brief explanation for the prediction based on the provided data and strategy signal.'
    ),
});
export type PredictMarketOutput = z.infer<typeof PredictMarketOutputSchema>;

export async function predictMarket(input: PredictMarketInput): Promise<PredictMarketOutput> {
  return predictMarketFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictMarketPrompt',
  input: {schema: PredictMarketInputSchema},
  output: {schema: PredictMarketOutputSchema},
  prompt: `You are a quantitative analyst AI. Your task is to predict the short-term price movement of a crypto asset.
{{#if strategySignal}}
A classic technical indicator has just generated a '{{{strategySignal}}}' signal.
Your primary job is to evaluate if this signal is valid based on the recent price action. Use the indicator signal as your main guide, but analyze the market data to confirm or deny it.
{{else}}
Your task is to predict the short-term price movement of a crypto asset based on its recent k-line data.
{{/if}}

Asset: {{{symbol}}}

Analyze the recent price action from the following data and determine if the price is likely to go UP, DOWN, or remain NEUTRAL in the next few periods.

Provide a confidence score for your prediction and a brief reasoning based on technical analysis patterns you observe.

Recent Data:
\`\`\`json
{{{recentData}}}
\`\`\`
`,
});

const predictMarketFlow = ai.defineFlow(
  {
    name: 'predictMarketFlow',
    inputSchema: PredictMarketInputSchema,
    outputSchema: PredictMarketOutputSchema,
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
    throw new Error(`AI model call failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }
);
