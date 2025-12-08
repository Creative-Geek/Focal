import OpenAI from 'openai';
import { BaseAIProvider, AIResponse } from './base.service';

/**
 * OpenAI Provider (GitHub Models)
 * Uses GPT-4o from GitHub Models API
 */
export class OpenAIProvider extends BaseAIProvider {
    private apiKeys: string[];
    private modelName: string;

    constructor(apiKeys: string | string[], modelName: string = 'gpt-4o') {
        super();
        // Support both single key (backward compatible) and array of keys
        this.apiKeys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
        this.modelName = modelName;
    }

    /**
     * Check if an error indicates rate limiting or quota exceeded
     */
    private isRateLimitError(error: any): boolean {
        const errorMessage = error?.message?.toLowerCase() || '';
        const errorString = String(error).toLowerCase();
        
        return (
            errorMessage.includes('rate limit') ||
            errorMessage.includes('quota') ||
            errorMessage.includes('429') ||
            errorMessage.includes('resource exhausted') ||
            errorMessage.includes('too many requests') ||
            errorString.includes('rate limit') ||
            errorString.includes('quota')
        );
    }

    async processReceipt(base64Image: string): Promise<AIResponse> {
        let lastError: any = null;

        // Try each API key in sequence
        for (let i = 0; i < this.apiKeys.length; i++) {
            const apiKey = this.apiKeys[i];
            const keyLabel = i === 0 ? 'primary' : `fallback ${i}`;
            
            try {
                console.log(`[OpenAIProvider] Attempting with ${keyLabel} API key`);
                
                const client = new OpenAI({
                    baseURL: 'https://models.github.ai/inference',
                    apiKey: apiKey,
                });

                const { imageData, mimeType } = this.parseBase64Image(base64Image);

                // Define JSON schema for structured output
                const responseFormat = {
                    type: 'json_schema' as const,
                    json_schema: {
                        name: 'receipt_extraction',
                        strict: true,
                        schema: {
                            type: 'object',
                            properties: {
                                merchant: {
                                    type: 'string',
                                    description: 'Store or restaurant name',
                                },
                                date: {
                                    type: 'string',
                                    description: 'Transaction date in YYYY-MM-DD format',
                                },
                                total: {
                                    type: 'number',
                                    description: 'Total amount (number only, no currency symbols)',
                                },
                                category: {
                                    type: 'string',
                                    description: 'Expense category',
                                    enum: ['Food & Drink', 'Groceries', 'Travel', 'Shopping', 'Utilities', 'Other'],
                                },
                                lineItems: {
                                    type: 'array',
                                    description: 'Individual items from the receipt',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            description: {
                                                type: 'string',
                                                description: 'Item description',
                                            },
                                            quantity: {
                                                type: 'number',
                                                description: 'Item quantity',
                                            },
                                            price: {
                                                type: 'number',
                                                description: 'Item price',
                                            },
                                        },
                                        required: ['description', 'quantity', 'price'],
                                        additionalProperties: false,
                                    },
                                },
                            },
                            required: ['merchant', 'date', 'total', 'category', 'lineItems'],
                            additionalProperties: false,
                        },
                    },
                };

                const completion = await client.chat.completions.create({
                    model: this.modelName,
                    messages: [
                        {
                            role: 'system',
                            content: this.getSystemInstruction(),
                        },
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: `data:image/${mimeType};base64,${imageData}`,
                                    },
                                },
                                {
                                    type: 'text',
                                    text: 'Extract the receipt information following the specified schema.',
                                },
                            ],
                        },
                    ],
                    response_format: responseFormat,
                    temperature: 0.1,
                    max_tokens: 2000,
                });

                const message = completion.choices[0]?.message;
                if (!message?.content) {
                    throw new Error('No response from OpenAI');
                }

                const expenseData = JSON.parse(message.content);

                console.log(`[OpenAIProvider] Success with ${keyLabel} API key`);

                return {
                    success: true,
                    data: expenseData,
                };
            } catch (error: any) {
                console.error(`[OpenAIProvider] Error with ${keyLabel} API key:`, error);
                lastError = error;
                
                // If this is a rate limit error and we have more keys to try, continue
                if (this.isRateLimitError(error) && i < this.apiKeys.length - 1) {
                    console.log(`[OpenAIProvider] Rate limit detected, trying next API key...`);
                    continue;
                }
                
                // If it's not a rate limit error, or we've exhausted all keys, break
                if (!this.isRateLimitError(error)) {
                    console.log(`[OpenAIProvider] Non-rate-limit error, not retrying`);
                    break;
                }
            }
        }

        // All attempts failed
        console.error('[OpenAIProvider] All API keys exhausted');
        return {
            success: false,
            error: lastError?.message || 'Failed to process receipt',
        };
    }
}
