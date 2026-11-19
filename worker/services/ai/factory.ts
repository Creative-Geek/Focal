import { BaseAIProvider } from './base.service';
import { GeminiProvider } from './gemini.provider';
import {
    OpenAIProvider,
    DEFAULT_OPENAI_COMP_BASE_URL,
    DEFAULT_OPENAI_COMP_MODEL,
} from './openai.provider';
import { NvidiaProvider, DEFAULT_NVIDIA_MODEL } from './nvidia.provider';
import { GroqProvider, DEFAULT_GROQ_VISION_MODEL } from './groq.provider';

export const ACTIVE_AI_PROVIDERS = ['gemini', 'nvidia', 'groq'] as const;
export type ActiveAIProviderType = (typeof ACTIVE_AI_PROVIDERS)[number];
export type AIProviderType = ActiveAIProviderType | 'openai';

export function isActiveAIProvider(value: unknown): value is ActiveAIProviderType {
    return typeof value === 'string' && (ACTIVE_AI_PROVIDERS as readonly string[]).includes(value);
}

/**
 * Factory to create AI provider instances based on environment configuration
 */
export class AIProviderFactory {
    /**
     * Create an AI provider instance based on the provider type
     * @param providerType - The type of AI provider to create
     * @param apiKeys - API key(s) for the provider (string or array of strings for fallback)
     * @param modelName - Optional model name override
     * @param env - Environment variables (optional provider-specific config like OPENAI_COMP_BASE_URL)
     */
    static createProvider(
        providerType: AIProviderType,
        apiKeys: string | string[],
        modelName?: string,
        env?: any
    ): BaseAIProvider {
        switch (providerType) {
            case 'gemini':
                return new GeminiProvider(apiKeys, modelName || 'gemini-2.5-flash');

            case 'openai':
                return new OpenAIProvider(
                    apiKeys,
                    modelName || env?.OPENAI_COMP_MODEL || DEFAULT_OPENAI_COMP_MODEL,
                    env?.OPENAI_COMP_BASE_URL || DEFAULT_OPENAI_COMP_BASE_URL
                );

            case 'nvidia':
                return new NvidiaProvider(apiKeys, modelName || DEFAULT_NVIDIA_MODEL);

            case 'groq':
                return new GroqProvider(
                    apiKeys,
                    modelName || DEFAULT_GROQ_VISION_MODEL,
                    env?.AZURE_VISION_ENDPOINT,
                    env?.AZURE_VISION_KEY
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
                if (!env.OPENAI_COMP_API_KEY) {
                    throw new Error('OPENAI_COMP_API_KEY not configured');
                }
                return env.OPENAI_COMP_API_KEY;

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
     * Get all API keys (primary + fallback) from environment based on provider type
     * Returns an array with at least the primary key, and optionally the fallback key
     */
    static getApiKeys(env: any, providerType: AIProviderType): string[] {
        const keys: string[] = [];

        switch (providerType) {
            case 'gemini':
                if (!env.GEMINI_API_KEY) {
                    throw new Error('GEMINI_API_KEY not configured');
                }
                keys.push(env.GEMINI_API_KEY);
                if (env.GEMINI_API_KEY_2) {
                    keys.push(env.GEMINI_API_KEY_2);
                }
                break;

            case 'openai':
                if (!env.OPENAI_COMP_API_KEY) {
                    throw new Error('OPENAI_COMP_API_KEY not configured');
                }
                keys.push(env.OPENAI_COMP_API_KEY);
                if (env.OPENAI_COMP_API_KEY_2) {
                    keys.push(env.OPENAI_COMP_API_KEY_2);
                }
                break;

            case 'nvidia':
                if (!env.NVIDIA_API_KEY) {
                    throw new Error('NVIDIA_API_KEY not configured');
                }
                keys.push(env.NVIDIA_API_KEY);
                if (env.NVIDIA_API_KEY_2) {
                    keys.push(env.NVIDIA_API_KEY_2);
                }
                break;

            case 'groq':
                if (!env.GROQ_API_KEY) {
                    throw new Error('GROQ_API_KEY not configured');
                }
                keys.push(env.GROQ_API_KEY);
                if (env.GROQ_API_KEY_2) {
                    keys.push(env.GROQ_API_KEY_2);
                }
                break;

            default:
                throw new Error(`Unknown AI provider: ${providerType}`);
        }

        return keys;
    }

    /**
     * Get the default model name for a provider
     */
    static getDefaultModel(providerType: AIProviderType): string {
        switch (providerType) {
            case 'gemini':
                return 'gemini-2.5-flash';
            case 'openai':
                return DEFAULT_OPENAI_COMP_MODEL;
            case 'nvidia':
                return DEFAULT_NVIDIA_MODEL;
            case 'groq':
                return DEFAULT_GROQ_VISION_MODEL;
            default:
                return '';
        }
    }
}
