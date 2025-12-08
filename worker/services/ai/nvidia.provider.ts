import { BaseAIProvider, AIResponse } from './base.service';

/**
 * Nvidia NIM Provider
 * Uses llama-3.2-90b-vision-instruct model
 */
export class NvidiaProvider extends BaseAIProvider {
    private apiKeys: string[];
    private modelName: string;
    private invokeUrl: string;

    constructor(apiKeys: string | string[], modelName: string = 'meta/llama-3.2-90b-vision-instruct') {
        super();
        // Support both single key (backward compatible) and array of keys
        this.apiKeys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
        this.modelName = modelName;
        this.invokeUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
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
                console.log(`[NvidiaProvider] Attempting with ${keyLabel} API key`);
                
                const { imageData, mimeType } = this.parseBase64Image(base64Image);

                // Define JSON schema for structured output
                const jsonSchema = {
                    type: 'object',
                    properties: {
                        merchant: { type: 'string' },
                        date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
                        total: { type: 'number' },
                        category: {
                            type: 'string',
                            enum: ['Food & Drink', 'Groceries', 'Travel', 'Shopping', 'Utilities', 'Other'],
                        },
                        lineItems: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    description: { type: 'string' },
                                    quantity: { type: 'number' },
                                    price: { type: 'number' },
                                },
                                required: ['description', 'quantity', 'price'],
                            },
                        },
                    },
                    required: ['merchant', 'date', 'total', 'category', 'lineItems'],
                };

                // Prepare the message with image
                const messages = [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: this.getSystemInstruction(),
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/${mimeType};base64,${imageData}`,
                                },
                            },
                        ],
                    },
                ];

                const payload = {
                    model: this.modelName,
                    messages: messages,
                    max_tokens: 2048,
                    temperature: 0.1,
                    top_p: 0.95,
                    stream: false,
                    extra_body: {
                        nvext: {
                            guided_json: jsonSchema,
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

                // Parse the JSON response
                // With guided_json, the response should be clean JSON
                // But keep fallback extraction for robustness
                let jsonText = content.trim();

                // Try to extract JSON from markdown code blocks if present
                if (jsonText.startsWith('```json')) {
                    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                } else if (jsonText.startsWith('```')) {
                    jsonText = jsonText.replace(/```\n?/g, '').trim();
                }

                // If guided_json failed and we have prose text, try to extract JSON with regex
                if (!jsonText.startsWith('{')) {
                    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        jsonText = jsonMatch[0];
                    } else {
                        throw new Error('Could not extract valid JSON from response');
                    }
                }

                const expenseData = JSON.parse(jsonText);

                console.log(`[NvidiaProvider] Success with ${keyLabel} API key`);

                return {
                    success: true,
                    data: expenseData,
                };
            } catch (error: any) {
                console.error(`[NvidiaProvider] Error with ${keyLabel} API key:`, error);
                lastError = error;
                
                // If this is a rate limit error and we have more keys to try, continue
                if (this.isRateLimitError(error) && i < this.apiKeys.length - 1) {
                    console.log(`[NvidiaProvider] Rate limit detected, trying next API key...`);
                    continue;
                }
                
                // If it's not a rate limit error, or we've exhausted all keys, break
                if (!this.isRateLimitError(error)) {
                    console.log(`[NvidiaProvider] Non-rate-limit error, not retrying`);
                    break;
                }
            }
        }

        // All attempts failed
        console.error('[NvidiaProvider] All API keys exhausted');
        return {
            success: false,
            error: lastError?.message || 'Failed to process receipt',
        };
    }
}
