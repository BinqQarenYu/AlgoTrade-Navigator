
'use server';
/**
 * @fileOverview An AI agent for analyzing liquidity patterns on a chart.
 *
 * - analyzeLiquidity - A function that identifies potential liquidity grabs.
 * - AnalyzeLiquidityInput - The input type for the analyzeLiquidity function.
 * - AnalyzeLiquidityOutput - The return type for the analyzeLiquidity function.
 * - LiquidityEvent - The structure for a single identified liquidity event.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeLiquidityInputSchema = z.object({
  historicalData: z
    .string()
    .describe(
      'A JSON string representing an array of recent k-line/candlestick data.'
    ),
});
export type AnalyzeLiquidityInput = z.infer<typeof AnalyzeLiquidityInputSchema>;

export const LiquidityEventSchema = z.object({
  time: z.number().describe('The timestamp (milliseconds) of the candle where the liquidity grab occurred.'),
  priceLevel: z.number().describe('The approximate price level of the liquidity that was targeted.'),
  direction: z.enum(['bullish', 'bearish']).describe("The direction of the market move *after* the liquidity grab. 'bullish' means price moved up after grabbing lows. 'bearish' means price moved down after grabbing highs."),
  type: z.enum(['grab', 'sweep']).describe("The type of liquidity event. 'grab' implies a more significant reversal."),
});
export type LiquidityEvent = z.infer<typeof LiquidityEventSchema>;

const AnalyzeLiquidityOutputSchema = z.object({
  events: z.array(LiquidityEventSchema).describe("An array of identified liquidity grab events."),
});
export type AnalyzeLiquidityOutput = z.infer<typeof AnalyzeLiquidityOutputSchema>;

export async function analyzeLiquidity(input: AnalyzeLiquidityInput): Promise<AnalyzeLiquidityOutput> {
  return analyzeLiquidityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeLiquidityPrompt',
  input: {schema: AnalyzeLiquidityInputSchema},
  output: {schema: AnalyzeLiquidityOutputSchema},
  prompt: `You are an expert in technical analysis, specializing in price action and market liquidity concepts. Your task is to analyze the provided historical candlestick data to identify significant liquidity grabs (also known as "stop hunts" or "sweeps").

A liquidity grab occurs when price briefly moves beyond a key swing high or swing low to trigger stop-loss orders, before sharply reversing.

**Analysis Criteria:**
1.  **Identify Key Swing Points:** Look for clear, recent swing highs and swing lows in the data.
2.  **Detect the Sweep:** Find a candle that pushes just past one of these swing points (e.g., its high goes above a swing high, or its low goes below a swing low).
3.  **Confirm the Reversal:** After the sweep, the price must quickly and aggressively reverse direction. The candle that sweeps the liquidity should ideally close back inside the previous range, showing rejection.
4.  **Determine Direction:**
    -   A **bearish** grab is when price sweeps above a swing high and then reverses downwards.
    -   A **bullish** grab is when price sweeps below a swing low and then reverses upwards.
5.  **Output Events:** For each confirmed liquidity grab, create a liquidity event object with the timestamp of the candle that performed the sweep.

Analyze the following data and return an array of all such events you can identify.

**Historical Data:**
\`\`\`json
{{{historicalData}}}
\`\`\`
`,
});

const analyzeLiquidityFlow = ai.defineFlow(
  {
    name: 'analyzeLiquidityFlow',
    inputSchema: AnalyzeLiquidityInputSchema,
    outputSchema: AnalyzeLiquidityOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
