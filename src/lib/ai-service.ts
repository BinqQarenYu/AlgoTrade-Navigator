
'use server';

// Define the type for a Genkit prompt based on its usage in the project.
type GenkitPrompt<I, O> = (input: I) => Promise<{ output?: O | undefined }>;

/**
 * A centralized wrapper for running Genkit AI flows with robust error handling and retry logic.
 * @param prompt The Genkit prompt object to execute.
 * @param input The input data for the prompt.
 * @param maxRetries The maximum number of times to retry on transient errors.
 * @returns A promise that resolves to the prompt's output.
 * @throws An error with a user-friendly message if the flow fails.
 */
export async function runAiFlow<I, O>(
    prompt: GenkitPrompt<I, O>,
    input: I,
    maxRetries: number = 3
): Promise<O> {
    let lastError: Error | null = null;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const { output } = await prompt(input);
            if (!output) {
                // This can happen due to safety filters or other content generation issues.
                throw new Error("The AI model did not return a valid response. This could be due to safety filters or an internal error.");
            }
            return output;
        } catch (e: any) {
            lastError = e;
            const errorMessage = e.message || '';

            // Check for non-retriable quota errors first. If it's a quota error, stop immediately.
            if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota')) {
                console.error("AI quota exceeded. Not retrying.", e);
                throw new Error("You have exceeded your daily AI quota. Please check your plan and billing details.");
            }

            // For any other error, log it and retry with exponential backoff.
            console.log(`Attempt ${i + 1} of ${maxRetries} failed. Retrying in ${Math.pow(2, i)}s...`, e);
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
    }
    // If all retries failed, throw the final user-friendly error.
    console.error("All AI flow retries failed.", lastError);
    throw new Error("The AI service is currently overloaded or unavailable. Please try again in a few minutes.");
}
