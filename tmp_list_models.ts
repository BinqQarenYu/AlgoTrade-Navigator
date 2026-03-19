import { ai } from './src/ai/genkit';

async function main() {
    console.log('Available Genkit Models:');
    const models = await ai.listModels();
    models.forEach(m => console.log(`- ${m.name}`));
}

main().catch(console.error);
