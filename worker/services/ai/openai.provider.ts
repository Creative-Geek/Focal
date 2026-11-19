import OpenAI from 'openai';
import { BaseAIProvider, AIResponse } from './base.service';

export const DEFAULT_OPENAI_COMP_BASE_URL = 'https://openrouter.ai/api/v1';
export const DEFAULT_OPENAI_COMP_MODEL = 'openrouter/free';

/**
 * Generic OpenAI-Compatible Provider
 * Defaults to OpenRouter's free models router (https://openrouter.ai/api/v1, model: openrouter/free).
 * Wired up via OPENAI_COMP_* env vars but currently disabled from active UI/handlers.
 */
export class OpenAIProvider extends BaseAIProvider {
    private apiKeys: string[];
    private modelName: string;
    private baseURL: string;

    constructor(
        apiKeys: string | string[],
        modelName: string = DEFAULT_OPENAI_COMP_MODEL,
        baseURL: string = DEFAULT_OPENAI_COMP_BASE_URL
    ) {
        super();
        // Support both single key (backward compatible) and array of keys
        this.apiKeys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
        this.modelName = modelName;
        this.baseURL = baseURL;
    }

    async processReceipt(base64Image: string): Promise<AIResponse> {
        try {
            const { imageData, mimeType } = this.parseBase64Image(base64Image);

            const expenseData = await this.executeWithFallback(
                this.apiKeys,
                async (apiKey) => {
                    const client = new OpenAI({
                        baseURL: this.baseURL,
                        apiKey: apiKey,
                        defaultHeaders: {
                            'X-Title': 'Focal',
                        },
                    });

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
                                                    description: 'Unit price for a single item (quantity * price equals line subtotal)',
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
                                        text: 'Extract the receipt information following the specified schema. Return ONLY valid JSON.',
                                    },
                                ],
                            },
                        ],
                        response_format: responseFormat,
                        temperature: 0.1,
                        max_tokens: 4000,
                    });

                    const message = completion.choices[0]?.message;
                    if (!message?.content) {
                        throw new Error('No response from OpenAI-compatible provider');
                    }

                    return this.parseExpenseResponse(message.content);
                },
                'OpenAIProvider'
            );

            return {
                success: true,
                data: expenseData,
            };
        } catch (error: any) {
            console.error('[OpenAIProvider] Error:', error);
            return {
                success: false,
                error: error.message || 'Failed to process receipt',
            };
        }
    }
}
