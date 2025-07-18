
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
  prompt: `You are an expert TypeScript programmer specializing in creating algorithmic trading strategies. Your task is to convert a JSON configuration object into the BODY of an 'async' TypeScript function.

**Key Requirements:**
1.  **File Name:** Generate a unique, snake_case file name for the strategy based on its name in the config. Append "_strategy.ts".
2.  **No Imports:** CRITICAL: Do NOT include any 'import' or 'require' statements. The execution environment will provide all necessary indicator functions (e.g., calculateSMA, calculateRSI) as pre-defined variables in the function's scope.
3.  **Function Body Only:** Your generated 'code' should ONLY be the body of an async function. Do not wrap it in a function definition like \`async function(...) { ... }\`. The function will be called with \`(data, params)\` arguments.
4.  **Parameters:** The 'params' object will contain the necessary parameters based on the indicators in the config.
5.  **Logic:**
    - The function body must assume it has access to \`data: HistoricalData[]\` and \`params\` as arguments.
    - It must calculate all required indicators using the pre-defined functions.
    - It must then iterate through the data and implement the logic defined in the \`entryConditions\` and \`exitConditions\`.
    - A condition like \`"condition": "crosses_above"\` for "IndicatorA" and "IndicatorB" means you must check \`IndicatorA[i-1] <= IndicatorB[i-1] && IndicatorA[i] > IndicatorB[i]\`.
    - When a condition is met, it must set the \`buySignal\` or \`sellSignal\` property on the corresponding candle in the returned data array.
    - The 'value' in a rule can be another indicator or a static number. Your code must handle both cases.
    - Implement the \`reverse\` parameter to invert the buy/sell signals if it's true.
    - The final line of your code MUST be \`return data;\`.

**Example Indicator Calculation (within the function body):**
\`\`\`typescript
const closePrices = data.map(d => d.close);
const sma20 = calculateSMA(closePrices, params.sma_period);
const rsi14 = calculateRSI(closePrices, params.rsi_period);

data.forEach((d, i) => {
  d.sma_20 = sma20[i];
  d.rsi_14 = rsi14[i];
});
// ... more logic ...
return data;
\`\`\`

**JSON Configuration to Convert:**
\`\`\`json
{{{config}}}
\`\`\`

Generate the TypeScript code for the function body in the \`code\` field and the file name in the \`fileName\` field. Do not add any explanatory text or function wrappers. The code should be ready to be injected directly into a new async Function.
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
