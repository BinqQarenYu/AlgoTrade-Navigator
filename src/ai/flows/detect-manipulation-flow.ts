
'use server';
/**
 * @fileOverview An AI agent for detecting potential market manipulation patterns.
 *
 * - detectManipulation - A function that analyzes historical data for pump and dump schemes.
 * - DetectManipulationInput - The input type for the detectManipulation function.
 * - DetectManipulationOutput - The return type for the detectManipulation function.
 */

import {ai} from '@/ai/genkit';
import { runAiFlow } from '@/lib/ai-service';
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

const detectManipulationPrompt = ai.definePrompt({
  name: 'detectManipulationPrompt',
  input: {schema: DetectManipulationInputSchema},
  output: {schema: DetectManipulationOutputSchema},
  prompt: `You are an expert financial analyst specializing in forensic analysis of market manipulation, specifically "Pump and Dump" schemes. Your primary task is to distinguish between legitimate high-volume trading and deceptive manipulation.

**Distinguishing Manipulation from Legitimate High-Volume Trading:**
-   **Legitimate Trading:** High volume and sharp price moves are often caused by real news, major events, or large institutional trades. This activity is chaotic but organic, with two-sided participation (real buyers and sellers). The goal is to react to the market.
-   **Manipulation:** The goal is deception. It involves creating a false appearance of market activity to trick others. The price action looks unnatural and is designed to create FOMO, leading to a predictable collapse. The goal is to *create* the market reaction.

Your task is to analyze the provided historical price and volume data for {{{symbol}}} and determine if it exhibits the structured, deceptive characteristics of a pump and dump scheme.

A typical manipulation scheme unfolds in three phases:
1.  **The Accumulation Phase (The Quiet Before the Storm):**
    -   **Price:** Sideways or slightly declining trend, low volatility. Looks boring.
    -   **Volume:** Very low or declining trading volume. Public interest is minimal.
    -   **Goal:** The manipulator builds a large position quietly at a low price.

2.  **The Pump Phase (The Artificial Rally):**
    -   **Price:** An explosive, almost vertical, parabolic price increase. This is the active process where the manipulator is forcing the price up. The slope is unnaturally steep.
    -   **Volume:** A massive spike in trading volume. This is a critical signal used to manufacture the appearance of intense interest and trigger FOMO.
    -   **Goal:** To attract a crowd of unsuspecting buyers and create liquidity for the next phase.

3.  **The Distribution (or Dump) Phase (The Rug Pull):**
    -   **Price:** The price ascent stalls, churns sideways, or forms a "topping pattern". This is where the pumping stops. This phase is followed by a catastrophic price collapse as the manipulator's support is removed.
    -   **Volume:** Volume remains extremely high at the peak. This is the classic sign of distribution, where the manipulator sells their accumulated shares to the FOMO buyers. After the selling is complete, the price plummets, often on declining volume as there are no buyers left.
    -   **Goal:** To sell all accumulated shares at inflated prices.

**Your Analysis Task:**

Based on the provided historical data, perform the following:
1.  **Identify Phases:** Examine the data to see if you can identify any or all of the three phases described above. Provide the start and end timestamps (in milliseconds) for each phase you identify.
2.  **Assess Suspicion (Early Detection):** Your primary goal is early detection. Set \`isManipulationSuspected\` to true even if only the Accumulation phase and the beginning of a Pump phase are visible. A clear Accumulation followed by a sharp, high-volume price spike is sufficient for a 'true' suspicion, even if the Dump has not occurred.
3.  **Set Confidence:** Provide a confidence score (0.0 to 1.0) for your assessment. A high confidence means the pattern is a textbook example. A lower confidence might indicate an early, developing pattern.
4.  **Identify Current Phase:** Determine which phase the asset is most likely in *at the end* of the provided data, or if the pattern has completed. Set to 'None' if no pattern is detected.
5.  **Provide Reasoning:** Write a detailed, evidence-based reasoning for your conclusion. If you suspect manipulation early (e.g., during the Pump phase), explain why the current pattern is anomalous and what to watch for next (e.g., a high-volume stall or reversal, which would indicate the Dump). When you mention a phase, include its start and end times in a human-readable format (e.g., "The pump phase began on August 28, 2025, at 4:00 PM GMT"). **Conclude with a clear recommendation on the best course of action for a trader.**

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
    const result = await runAiFlow(detectManipulationPrompt, input);
    if (!result) {
      throw new Error("AI flow returned no result");
    }
    return result;
  }
);

export async function detectManipulation(input: DetectManipulationInput): Promise<DetectManipulationOutput | null> {
  try {
    const result = await detectManipulationFlow(input);
    if (!result) {
      console.error("The AI flow for detecting market manipulation returned an empty result.");
      return null;
    }
    return result;
  } catch (error) {
    console.error("Error in detectManipulation:", error);
    return null;
  }
}
