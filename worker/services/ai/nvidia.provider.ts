import { BaseAIProvider, AIResponse } from './base.service';

export const DEFAULT_NVIDIA_MODEL = 'nvidia/nemotron-3.5-super-vl-120b-a12b';

/**
 * Nvidia NIM Provider
 * Uses nvidia/nemotron-3.5-super-vl-120b-a12b by default
 */
export class NvidiaProvider extends BaseAIProvider {
    private apiKeys: string[];
    private modelName: string;
    private invokeUrl: string;

    constructor(apiKeys: string | string[], modelName: string = DEFAULT_NVIDIA_MODEL) {
        super();
        // Support both single key (backward compatible) and array of keys
        this.apiKeys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
        this.modelName = modelName;
        this.invokeUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
    }

    async processReceipt(base64Image: string): Promise<AIResponse> {
        try {
            const { imageData, mimeType } = this.parseBase64Image(base64Image);

            const expenseData = await this.executeWithFallback(
                this.apiKeys,
                async (apiKey) => {
                    // Define JSON schema for structured output
                    const jsonSchema = {
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
                    };

                    // Prepare the messages with system prompt and receipt image
                    const messages = [
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
                    ];

                    const payload = {
                        model: this.modelName,
                        messages: messages,
                        max_tokens: 8192,
                        temperature: 0.2,
                        top_p: 0.95,
                        stream: false,
                        chat_template_kwargs: {
                            enable_thinking: false,
                        },
                        response_format: {
                            type: 'json_schema',
                            json_schema: {
                                name: 'receipt_extraction',
                                strict: true,
                                schema: jsonSchema,
                            },
                        },
                    };

                    const response = await fetch(this.invokeUrl, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                        },
                        body: JSON.stringify(payload),
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Nvidia API error: ${response.status} - ${errorText}`);
                    }

                    const data: any = await response.json();
                    const content = data.choices?.[0]?.message?.content;

                    if (!content) {
                        throw new Error('No response from Nvidia API');
                    }

                    return this.parseExpenseResponse(content);
                },
                'NvidiaProvider'
            );

            return {
                success: true,
                data: expenseData,
            };
        } catch (error: any) {
            console.error('[NvidiaProvider] Error:', error);
            return {
                success: false,
                error: error.message || 'Failed to process receipt',
            };
        }
    }
}
