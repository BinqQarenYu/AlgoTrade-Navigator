
'use server';

/**
 * @fileOverview A strategy validation AI agent.
 *
 * - validateStrategy - A function that handles the strategy validation process.
 * - ValidateStrategyInput - The input type for the validateStrategy function.
 * - ValidateStrategyOutput - The return type for the validateStrategy function.
 */

import {ai} from '@/ai/genkit';
import { runAiFlow } from '@/lib/ai-service';
import {z} from 'genkit';

const ValidateStrategyInputSchema = z.object({
  strategyParameters: z
    .string()
    .describe('The backtesting strategy parameters to validate.'),
  historicalData: z
    .string()
    .describe('Historical market data relevant to the backtesting strategy.'),
});
export type ValidateStrategyInput = z.infer<typeof ValidateStrategyInputSchema>;

const ValidateStrategyOutputSchema = z.object({
  feedback: z
    .string()
    .describe(
      'Feedback on how to optimize the strategy parameters for better performance, including suggestions for parameter adjustments and potential risks.'
    ),
});
export type ValidateStrategyOutput = z.infer<typeof ValidateStrategyOutputSchema>;

const validateStrategyPrompt = ai.definePrompt({
  name: 'validateStrategyPrompt',
  input: {schema: ValidateStrategyInputSchema},
  output: {schema: ValidateStrategyOutputSchema},
  prompt: `You are an expert in trading strategy optimization. You will evaluate the provided backtesting strategy parameters against the given historical data and provide feedback on how to optimize them for better performance.

Strategy Parameters: {{{strategyParameters}}}
Historical Data: {{{historicalData}}}

Provide specific suggestions for parameter adjustments and highlight any potential risks associated with the strategy.`,
});

const validateStrategyFlow = ai.defineFlow(
  {
    name: 'validateStrategyFlow',
    inputSchema: ValidateStrategyInputSchema,
    outputSchema: ValidateStrategyOutputSchema,
  },
  async input => runAiFlow(validateStrategyPrompt, input)
);

export async function validateStrategy(input: ValidateStrategyInput): Promise<ValidateStrategyOutput> {
  const result = await validateStrategyFlow(input);
  if (!result) {
    throw new Error("The AI flow for validating a strategy returned an empty result.");
  }
  return result;
}
