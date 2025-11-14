import { BaseAIProvider } from './base.service';
import { GeminiProvider } from './gemini.provider';
import { OpenAIProvider } from './openai.provider';
import { NvidiaProvider } from './nvidia.provider';
import { GroqProvider } from './groq.provider';

export type AIProviderType = 'gemini' | 'openai' | 'nvidia' | 'groq';

/**
 * Factory to create AI provider instances based on environment configuration
 */
export class AIProviderFactory {
    /**
     * Create an AI provider instance based on the provider type
     * @param providerType - The type of AI provider to create
     * @param apiKey - API key for the provider
     * @param modelName - Optional model name override
     * @param env - Environment variables (needed for Groq provider Azure credentials)
     */
    static createProvider(
        providerType: AIProviderType,
        apiKey: string,
        modelName?: string,
        env?: any
    ): BaseAIProvider {
        switch (providerType) {
            case 'gemini':
                return new GeminiProvider(apiKey, modelName || 'gemini-2.5-flash');

            case 'openai':
                return new OpenAIProvider(apiKey, modelName || 'gpt-4o');

            case 'nvidia':
                return new NvidiaProvider(apiKey, modelName || 'meta/llama-3.2-90b-vision-instruct');

            case 'groq':
                if (!env?.AZURE_VISION_ENDPOINT || !env?.AZURE_VISION_KEY) {
                    throw new Error('Azure Vision credentials not configured for Groq provider');
                }
                return new GroqProvider(
                    apiKey,
                    env.AZURE_VISION_ENDPOINT,
                    env.AZURE_VISION_KEY,
                    modelName || 'llama-3.3-70b-versatile'
                );

            default:
                throw new Error(`Unknown AI provider: ${providerType}`);
        }
    }

    /**
     * Get the appropriate API key from environment based on provider type
     */
    static getApiKey(env: any, providerType: AIProviderType): string {
        switch (providerType) {
            case 'gemini':
                if (!env.GEMINI_API_KEY) {
                    throw new Error('GEMINI_API_KEY not configured');
                }
                return env.GEMINI_API_KEY;

            case 'openai':
                if (!env.GITHUB_TOKEN) {
                    throw new Error('GITHUB_TOKEN not configured');
                }
                return env.GITHUB_TOKEN;

            case 'nvidia':
                if (!env.NVIDIA_API_KEY) {
                    throw new Error('NVIDIA_API_KEY not configured');
                }
                return env.NVIDIA_API_KEY;

            case 'groq':
                if (!env.GROQ_API_KEY) {
                    throw new Error('GROQ_API_KEY not configured');
                }
                return env.GROQ_API_KEY;

            default:
                throw new Error(`Unknown AI provider: ${providerType}`);
        }
    }

    /**
     * Get the default model name for a provider
     */
    static getDefaultModel(providerType: AIProviderType): string {
        switch (providerType) {
            case 'gemini':
                return 'gemini-2.5-flash';
            case 'openai':
                return 'gpt-4o';
            case 'nvidia':
                return 'meta/llama-3.2-90b-vision-instruct';
            case 'groq':
                return 'llama-3.3-70b-versatile';
            default:
                return '';
        }
    }
}
