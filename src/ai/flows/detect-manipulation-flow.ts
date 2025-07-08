
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
  reasoning: z.string().describe('A detailed explanation of the findings, referencing the three phases and the provided data.'),
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
2.  **Assess Suspicion:** Based on the evidence, set \`isManipulationSuspected\` to true if the pattern is clear and strong, and false otherwise.
3.  **Set Confidence:** Provide a confidence score (0.0 to 1.0) for your assessment. A high confidence means the pattern is a textbook example.
4.  **Identify Current Phase:** Determine which phase the asset is most likely in *at the end* of the provided data, or if the pattern has completed. Set to 'None' if no pattern is detected.
5.  **Provide Reasoning:** Write a detailed, evidence-based reasoning for your conclusion. Reference specific price action, volume changes, and the characteristics of each phase from the data.

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
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("The AI model did not return a valid response.");
    }
    return output;
  }
);
