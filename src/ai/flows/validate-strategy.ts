
'use server';

/**
 * @fileOverview A strategy validation AI agent.
 *
 * - validateStrategy - A function that handles the strategy validation process.
 * - ValidateStrategyInput - The input type for the validateStrategy function.
 * - ValidateStrategyOutput - The return type for the validateStrategy function.
 */

import {ai} from '@/ai/genkit';
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

export async function validateStrategy(input: ValidateStrategyInput): Promise<ValidateStrategyOutput> {
  return validateStrategyFlow(input);
}

const prompt = ai.definePrompt({
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
