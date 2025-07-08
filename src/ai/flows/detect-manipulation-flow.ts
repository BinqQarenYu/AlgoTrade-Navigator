
'use server';
/**
 * @fileOverview An AI agent for detecting potential market manipulation patterns.
 *
 * - detectManipulation - A function that analyzes historical data for pump and dump schemes.
 * - DetectManipulationInput - The input type for the detectManipulation function.
 * - DetectManipulationOutput - The return type for the detectManipulation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectManipulationInputSchema = z.object({
  symbol: z.string().describe('The trading symbol, e.g., BTCUSDT.'),
  historicalData: z
    .string()
    .describe(
      'A JSON string representing an array of recent k-line/candlestick data.'
    ),
});
export type DetectManipulationInput = z.infer<typeof DetectManipulationInputSchema>;

const PeriodSchema = z.object({
  startTime: z.number().describe('The start timestamp (milliseconds) of the phase.'),
  endTime: z.number().describe('The end timestamp (milliseconds) of the phase.'),
});

const DetectManipulationOutputSchema = z.object({
  isManipulationSuspected: z.boolean().describe('Whether a pump and dump pattern is strongly suspected.'),
  confidence: z.number().min(0).max(1).describe('The confidence level of the suspicion (0 to 1).'),
  currentPhase: z.enum(['Accumulation', 'Pump', 'Distribution', 'None']).describe('The most likely current phase if a pattern is active or recently completed.'),
  reasoning: z.string().describe("A detailed explanation of the findings, referencing the three phases, and a clear recommendation on the best course of action (e.g., 'Avoid this asset due to high manipulation risk')."),
  accumulationPeriod: PeriodSchema.optional().describe('The identified accumulation phase period. This is the quiet period before the pump.'),
  pumpPeriod: PeriodSchema.optional().describe('The identified pump phase period. This is the period of explosive price and volume increase.'),
  distributionPeriod: PeriodSchema.optional().describe('The identified distribution (dump) phase period. This is the high-volume topping and subsequent crash.'),
});
export type DetectManipulationOutput = z.infer<typeof DetectManipulationOutputSchema>;


export async function detectManipulation(input: DetectManipulationInput): Promise<DetectManipulationOutput> {
  return detectManipulationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectManipulationPrompt',
  input: {schema: DetectManipulationInputSchema},
  output: {schema: DetectManipulationOutputSchema},
  prompt: `You are an expert financial analyst specializing in forensic analysis of market manipulation, specifically "Pump and Dump" schemes.

Your task is to analyze the provided historical price and volume data for the asset {{{symbol}}} and determine if it exhibits characteristics of a pump and dump scheme.

A typical manipulation scheme unfolds in three phases:
1.  **The Accumulation Phase (The Quiet Before the Storm):**
    -   **Price:** Sideways or slightly declining trend, low volatility. Looks boring.
    -   **Volume:** Very low or declining trading volume. Public interest is minimal.
    -   **Goal:** The manipulator builds a large position quietly at a low price.

2.  **The Pump Phase (The Artificial Rally):**
    -   **Price:** An explosive, almost vertical, parabolic price increase. The slope is unnaturally steep.
    -   **Volume:** A massive spike in trading volume. This is a critical signal used to manufacture the appearance of intense interest and trigger FOMO.

3.  **The Distribution (Dump) Phase (The Rug Pull):**
    -   **Price:** The price ascent stalls, churns sideways, or forms a sharp peak, followed by a catastrophic price collapse.
    -   **Volume:** Volume remains extremely high at the peak as the manipulator sells (distributes) their shares to the FOMO buyers. After the selling is complete, the price plummets, often on declining volume as there are no buyers left.

**Your Analysis Task:**

Based on the provided historical data, perform the following:
1.  **Identify Phases:** Examine the data to see if you can identify any or all of the three phases described above. Provide the start and end timestamps (in milliseconds) for each phase you identify.
2.  **Assess Suspicion (Early Detection):** Your primary goal is early detection. Set \`isManipulationSuspected\` to true even if only the Accumulation phase and the beginning of a Pump phase are visible. A clear Accumulation followed by a sharp, high-volume price spike is sufficient for a 'true' suspicion, even if the Dump has not occurred.
3.  **Set Confidence:** Provide a confidence score (0.0 to 1.0) for your assessment. A high confidence means the pattern is a textbook example. A lower confidence might indicate an early, developing pattern.
4.  **Identify Current Phase:** Determine which phase the asset is most likely in *at the end* of the provided data, or if the pattern has completed. Set to 'None' if no pattern is detected.
5.  **Provide Reasoning:** Write a detailed, evidence-based reasoning for your conclusion. If you suspect manipulation early (e.g., during the Pump phase), explain why the current pattern is anomalous and what to watch for next (e.g., a high-volume stall or reversal, which would indicate the Dump). Reference specific price action, volume changes, and the characteristics of each phase from the data. Conclude with a clear recommendation on the best course of action for a trader.

**Historical Data:**
\`\`\`json
{{{historicalData}}}
\`\`\`

Provide your analysis in the structured JSON format required. Be objective and base your analysis solely on the data provided.
`,
});

const detectManipulationFlow = ai.defineFlow(
  {
    name: 'detectManipulationFlow',
    inputSchema: DetectManipulationInputSchema,
    outputSchema: DetectManipulationOutputSchema,
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
