
'use server';
/**
 * @fileOverview An AI agent for generating trading strategy code from a JSON configuration.
 *
 * - generateStrategy - A function that takes a JSON config and returns TypeScript code.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { runAiFlow } from '@/lib/ai-service';

const GenerateStrategyInputSchema = z.object({
  config: z.string().describe('A JSON string representing the user\'s visual strategy configuration.'),
});
export type GenerateStrategyInput = z.infer<typeof GenerateStrategyInputSchema>;

const GenerateStrategyOutputSchema = z.object({
  fileName: z.string().describe('The generated file name for the strategy, e.g., "my_custom_strategy.ts".'),
  code: z.string().describe('The full TypeScript code for the trading strategy.'),
});
export type GenerateStrategyOutput = z.infer<typeof GenerateStrategyOutputSchema>;


const generateStrategyPrompt = ai.definePrompt({
  name: 'generateStrategyPrompt',
  input: { schema: GenerateStrategyInputSchema },
  output: { schema: GenerateStrategyOutputSchema },
  prompt: `You are an expert TypeScript programmer specializing in creating algorithmic trading strategies. Your task is to convert a JSON configuration object into a fully functional, standalone TypeScript strategy file that conforms to our application's existing strategy interface.

**Key Requirements:**
1.  **File Name:** Generate a unique, snake_case file name for the strategy based on its name in the config. Append "_strategy.ts".
2.  **Interface:** The generated code MUST implement the \`Strategy\` interface from '@/lib/types'.
3.  **Imports:** You MUST import \`Strategy\`, \`HistoricalData\`, and any necessary indicator calculation functions (e.g., \`calculateSMA\`, \`calculateRSI\`) from '@/lib/indicators'.
4.  **Parameters:** Create a TypeScript interface for the strategy's parameters based on the indicators used in the config. Also, export a \`defaultParams\` object with the values from the config.
5.  **`calculate` Method:** This is the core of the strategy.
    - It must accept \`data: HistoricalData[]\` and \`params\` as arguments.
    - It must calculate all required indicators using the imported functions.
    - It must then iterate through the data and implement the logic defined in the \`entryConditions\` and \`exitConditions\`.
    - A condition like \`"condition": "crosses_above"\` for "IndicatorA" and "IndicatorB" means you must check \`IndicatorA[i-1] <= IndicatorB[i-1] && IndicatorA[i] > IndicatorB[i]\`.
    - When a condition is met, it must set the \`buySignal\` or \`sellSignal\` property on the corresponding candle in the returned data array.
    - The 'value' in a rule can be another indicator or a static number. Your code must handle both cases.
    - Implement the \`reverse\` parameter to invert the buy/sell signals if it's true.

**Example Indicator Calculation:**
\`\`\`typescript
const closePrices = data.map(d => d.close);
const sma20 = calculateSMA(closePrices, params.sma_period);
const rsi14 = calculateRSI(closePrices, params.rsi_period);

dataWithIndicators.forEach((d, i) => {
  d.sma_20 = sma20[i];
  d.rsi_14 = rsi14[i];
});
\`\`\`

**JSON Configuration to Convert:**
\`\`\`json
{{{config}}}
\`\`\`

Generate the complete TypeScript code in the \`code\` field and the file name in the \`fileName\` field. Do not add any explanatory text outside of the code comments. The code should be ready to be saved directly to a .ts file.
`,
});

const generateStrategyFlow = ai.defineFlow(
  {
    name: 'generateStrategyFlow',
    inputSchema: GenerateStrategyInputSchema,
    outputSchema: GenerateStrategyOutputSchema,
  },
  async (input) => runAiFlow(generateStrategyPrompt, input)
);

export async function generateStrategy(input: GenerateStrategyInput): Promise<GenerateStrategyOutput> {
  return generateStrategyFlow(input);
}
