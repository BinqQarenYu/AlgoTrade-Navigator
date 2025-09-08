
'use server';

/**
 * @fileOverview A Pine Script analysis and revision AI agent.
 *
 * - analyzePineScript - A function that handles the Pine Script analysis and revision process.
 * - AnalyzePineScriptInput - The input type for the analyzePineScript function.
 * - AnalyzePineScriptOutput - The return type for the analyzePineScript function.
 */

import {ai} from '@/ai/genkit';
import { runAiFlow } from '@/lib/ai-service';
import {z} from 'genkit';

const AnalyzePineScriptInputSchema = z.object({
  pineScript: z.string().describe('The Pine Script code to analyze and revise.'),
});
export type AnalyzePineScriptInput = z.infer<typeof AnalyzePineScriptInputSchema>;

const AnalyzePineScriptOutputSchema = z.object({
  analysis: z
    .string()
    .describe(
      'Detailed feedback on the Pine Script, including logic explanation, potential risks, and optimization suggestions.'
    ),
  hasErrors: z.boolean().describe('Whether any errors were found in the original script.'),
  revisedScript: z
    .string()
    .describe(
      'The corrected and optimized version of the Pine Script. If no errors were found, this should be the original script with potential improvements.'
    ),
});
export type AnalyzePineScriptOutput = z.infer<typeof AnalyzePineScriptOutputSchema>;

const analyzePineScriptPrompt = ai.definePrompt({
  name: 'analyzePineScriptPrompt',
  input: {schema: AnalyzePineScriptInputSchema},
  output: {schema: AnalyzePineScriptOutputSchema},
  prompt: `You are an expert in TradingView's Pine Script and quantitative trading strategies. Your task is to analyze the provided Pine Script code and revise it if necessary.

**Your Analysis Task:**
1.  **Error Detection:** First, meticulously check the script for any syntax errors, logic errors, or common Pine Script pitfalls (e.g., repainting, incorrect use of functions). Set \`hasErrors\` to true if you find any.
2.  **Revision:** Provide a corrected and optimized version of the script in the \`revisedScript\` field.
    - If errors are found, your primary goal is to fix them to make the script functional.
    - If no errors are found, suggest improvements for optimization, risk management (e.g., adding stop-loss/take-profit), or code clarity. The revised script should incorporate these suggestions.
3.  **Detailed Analysis:** In the \`analysis\` field, provide a thorough breakdown:
    -   **Strategy Logic:** Explain the core logic in simple terms.
    -   **Corrections Made:** If you found errors, explain what they were and how you fixed them.
    -   **Potential Risks:** Identify risks like overfitting or poor risk management.
    -   **Optimization Suggestions:** Suggest further improvements beyond what you've implemented in the revised script.

**Pine Script to Analyze and Revise:**
\`\`\`pinescript
{{{pineScript}}}
\`\`\`

Provide your response in the structured JSON format required. Ensure the \`revisedScript\` is complete and ready to be used.
`,
});

const analyzePineScriptFlow = ai.defineFlow(
  {
    name: 'analyzePineScriptFlow',
    inputSchema: AnalyzePineScriptInputSchema,
    outputSchema: AnalyzePineScriptOutputSchema,
  },
  async input => runAiFlow(analyzePineScriptPrompt, input)
);

export async function analyzePineScript(input: AnalyzePineScriptInput): Promise<AnalyzePineScriptOutput> {
  const result = await analyzePineScriptFlow(input);
  if (!result) {
    throw new Error("The AI flow for analyzing Pine Script returned an empty result.");
  }
  return result;
}
