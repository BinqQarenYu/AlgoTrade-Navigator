
'use server';

/**
 * @fileOverview A Pine Script analysis AI agent.
 *
 * - analyzePineScript - A function that handles the Pine Script analysis process.
 * - AnalyzePineScriptInput - The input type for the analyzePineScript function.
 * - AnalyzePineScriptOutput - The return type for the analyzePineScript function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzePineScriptInputSchema = z.object({
  pineScript: z.string().describe('The Pine Script code to analyze.'),
});
export type AnalyzePineScriptInput = z.infer<typeof AnalyzePineScriptInputSchema>;

const AnalyzePineScriptOutputSchema = z.object({
  feedback: z
    .string()
    .describe(
      'Detailed feedback on the Pine Script, including suggestions for optimization, potential risks, and code improvements.'
    ),
});
export type AnalyzePineScriptOutput = z.infer<typeof AnalyzePineScriptOutputSchema>;

export async function analyzePineScript(input: AnalyzePineScriptInput): Promise<AnalyzePineScriptOutput> {
  return analyzePineScriptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzePineScriptPrompt',
  input: {schema: AnalyzePineScriptInputSchema},
  output: {schema: AnalyzePineScriptOutputSchema},
  prompt: `You are an expert in TradingView's Pine Script and quantitative trading strategies. Your task is to analyze the provided Pine Script code.

Please provide a thorough analysis covering the following points:
1.  **Strategy Logic:** Explain the core logic of the strategy in simple terms. What are the entry and exit conditions?
2.  **Potential Risks:** Identify potential risks associated with this strategy (e.g., overfitting, high sensitivity to market conditions, lack of risk management).
3.  **Optimization Suggestions:** Suggest specific improvements or optimizations. This could include parameter tuning, adding filters (like volume or volatility), or improving the risk management (e.g., adding stop-loss or take-profit logic if it's missing).
4.  **Code Quality:** Briefly comment on the code quality and suggest any improvements for clarity or efficiency.

Pine Script to Analyze:
\`\`\`pinescript
{{{pineScript}}}
\`\`\`

Provide your feedback in a clear, structured markdown format.
`,
});

const analyzePineScriptFlow = ai.defineFlow(
  {
    name: 'analyzePineScriptFlow',
    inputSchema: AnalyzePineScriptInputSchema,
    outputSchema: AnalyzePineScriptOutputSchema,
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
