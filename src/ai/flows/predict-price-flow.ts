
'use server';
/**
 * @fileOverview An AI agent for price prediction using an ensemble of strategies.
 *
 * - predictPrice - A function that handles the price prediction process.
 * - PredictPriceInput - The input type for the predictPrice function.
 * - PredictPriceOutput - The return type for the predictPrice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input from a single strategy
const StrategyOutputSchema = z.object({
  strategyName: z.string().describe('The name of the strategy.'),
  signal: z.enum(['BUY', 'SELL', 'HOLD']).nullable().describe('The final signal from the strategy (if any).'),
  indicatorValues: z.record(z.any()).describe('A key-value map of the latest indicator values from this strategy.'),
});

const PredictPriceInputSchema = z.object({
  asset: z.string().describe("The asset symbol, e.g., BTCUSDT."),
  interval: z.string().describe("The time interval of the data, e.g., '5m'."),
  recentData: z.string().describe("A JSON string of recent k-line/candlestick data."),
  strategyOutputs: z.array(StrategyOutputSchema).describe('The outputs from multiple trading strategies.'),
  marketContext: z.string().describe('General market context, like the Fear & Greed Index value.'),
});
export type PredictPriceInput = z.infer<typeof PredictPriceInputSchema>;

const PredictPriceOutputSchema = z.object({
    predictedPrice: z.number().describe("The predicted price for the asset in the next interval."),
    confidence: z.number().min(0).max(1).describe("The confidence level of the prediction, from 0 to 1."),
    reasoning: z.string().describe("A detailed explanation of how the prediction was derived, considering the combined influence of all strategy inputs and the market context."),
});
export type PredictPriceOutput = z.infer<typeof PredictPriceOutputSchema>;

export async function predictPrice(input: PredictPriceInput): Promise<PredictPriceOutput> {
  return predictPriceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictPricePrompt',
  input: {schema: PredictPriceInputSchema},
  output: {schema: PredictPriceOutputSchema},
  prompt: `You are a sophisticated quantitative analysis AI, a "meta-model" designed to predict the future price of a financial asset by synthesizing inputs from multiple trading strategies.

Your goal is to perform a regression task: predict the asset's price for the next interval.

**Asset to Analyze:**
- Asset: {{{asset}}}
- Interval: {{{interval}}}

**Current Market Context:**
- {{marketContext}}

**Recent Price Action (for context):**
\`\`\`json
{{{recentData}}}
\`\`\`

**Strategy Ensemble Inputs:**
You have received the following signals and indicator data from your underlying strategies. You must weigh the contribution of each strategy to make a final price prediction.

{{#each strategyOutputs}}
- **Strategy: {{strategyName}}**
  - Signal: {{#if signal}}{{signal}}{{else}}None{{/if}}
  - Key Indicators:
    {{#each indicatorValues}}
    - {{@key}}: {{this}}
    {{/each}}
{{/each}}

**Your Task:**
1.  **Analyze each strategy's output.** Does a trend-following strategy (like EMA Crossover) agree with a mean-reversion strategy (like Bollinger Bands)? Is there confluence or divergence?
2.  **Weigh the signals.** A BUY signal from one strategy and a HOLD from another might suggest mild upward pressure. Conflicting BUY and SELL signals require careful consideration of the context and indicator values.
3.  **Consider the market context.** How does the Fear & Greed Index influence the potential price movement? A BUY signal in a "Greed" market might have less upside than one in a "Fear" market.
4.  **Perform Regression:** Based on all the above information, predict the single price value you expect for the asset at the close of the *next* {{{interval}}} candle.
5.  **Provide Reasoning:** Explain your thought process clearly. Detail which strategies had the most influence on your prediction and why.

Generate the output in the required JSON format.
`,
});

const predictPriceFlow = ai.defineFlow(
  {
    name: 'predictPriceFlow',
    inputSchema: PredictPriceInputSchema,
    outputSchema: PredictPriceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
