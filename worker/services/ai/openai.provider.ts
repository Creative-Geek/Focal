import OpenAI from 'openai';
import { BaseAIProvider, AIResponse } from './base.service';

/**
 * OpenAI Provider (GitHub Models)
 * Uses GPT-4o from GitHub Models API
 */
export class OpenAIProvider extends BaseAIProvider {
    private client: OpenAI;
    private modelName: string;

    constructor(apiKey: string, modelName: string = 'gpt-4o') {
        super();
        this.client = new OpenAI({
            baseURL: 'https://models.github.ai/inference',
            apiKey: apiKey,
        });
        this.modelName = modelName;
    }

    async processReceipt(base64Image: string): Promise<AIResponse> {
        try {
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

            const completion = await this.client.chat.completions.create({
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

            return {
                success: true,
                data: expenseData,
            };
        } catch (error: any) {
            console.error('OpenAI API error:', error);
            return {
                success: false,
                error: error.message || 'Failed to process receipt',
            };
        }
    }
}
