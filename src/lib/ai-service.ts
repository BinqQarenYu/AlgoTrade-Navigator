
'use server';


/**
 * A centralized wrapper for running Genkit AI flows with robust error handling and retry logic.
 * @param prompt The Genkit prompt object to execute.
 * @param input The input data for the prompt.
 * @param maxRetries The maximum number of times to retry on transient errors.
 * @returns A promise that resolves to the prompt's output.
 * @throws An error with a user-friendly message if the flow fails.
 */
export async function runAiFlow<I, O>(
    prompt: any,
    input: any, // Changed to any to allow checking for apiKey
    maxRetries: number = 3
): Promise<O> {
    let effectiveApiKey = input?.apiKey;

    // 1. If key is missing in input, try to recovery from server-side persistence
    if (!effectiveApiKey) {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const persistencePath = path.join(process.cwd(), 'data', 'app-settings.json');
            const stats = await fs.stat(persistencePath).catch(() => null);
            if (stats) {
                const data = JSON.parse(await fs.readFile(persistencePath, 'utf8'));
                if (data.geminiApiKey) effectiveApiKey = data.geminiApiKey;
                if (data.geminiModel) input.model = data.geminiModel;
            }
        } catch (e) {
            console.error("Failed to recover API key from persistence:", e);
        }
    }

    // 2. Inject into environment
    if (effectiveApiKey) {
        process.env.GOOGLE_GENAI_API_KEY = effectiveApiKey;
        process.env.GOOGLE_API_KEY = effectiveApiKey;
        process.env.GEMINI_API_KEY = effectiveApiKey;
    }

    let lastError: Error | null = null;
    for (let i = 0; i < maxRetries; i++) {
        try {
            // 3. Pass in multiple Genkit-compatible config locations
            const modelId = input?.model ? `googleai/${input.model}` : undefined;
            const options: any = {
                model: modelId,
                config: effectiveApiKey ? { apiKey: effectiveApiKey } : {},
                modelConfig: effectiveApiKey ? { apiKey: effectiveApiKey } : {}
            };

            const { output } = await prompt(input, options);
            if (!output) {
                throw new Error("The AI model did not return a valid response.");
            }
            return output;
        } catch (e: any) {
            lastError = e;
            const errorMessage = e.message || '';

            if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota')) {
                throw new Error("AI quota exceeded. Please check your Gemini API key and billing.");
            }
            
            if (errorMessage.includes('FAILED_PRECONDITION') || errorMessage.includes('API key')) {
                throw new Error("Gemini API Key missing or invalid. Action: Go to Settings, paste your key, and click 'Save Configuration to Server'.");
            }

            console.log(`Attempt ${i + 1} of ${maxRetries} failed. Retrying...`, e);
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
    }
    throw new Error(lastError?.message || "The AI service is currently unavailable.");
}
