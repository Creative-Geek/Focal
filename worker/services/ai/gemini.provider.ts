import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { BaseAIProvider, AIResponse } from './base.service';

/**
 * Google Gemini AI Provider
 * Supports: gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite
 */
export class GeminiProvider extends BaseAIProvider {
    private apiKeys: string[];
    private modelName: string;

    constructor(apiKeys: string | string[], modelName: string = 'gemini-2.5-flash') {
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
                console.log(`[GeminiProvider] Attempting with ${keyLabel} API key`);
                
                const genAI = new GoogleGenerativeAI(apiKey);

                const model = genAI.getGenerativeModel({
                    model: this.modelName,
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: SchemaType.OBJECT,
                            properties: {
                                merchant: {
                                    type: SchemaType.STRING,
                                    description: 'Store or restaurant name',
                                    nullable: false,
                                },
                                date: {
                                    type: SchemaType.STRING,
                                    description: 'Transaction date in YYYY-MM-DD format',
                                    nullable: false,
                                },
                                total: {
                                    type: SchemaType.NUMBER,
                                    description: 'Total amount (number only, no currency symbols)',
                                    nullable: false,
                                },
                                category: {
                                    type: SchemaType.STRING,
                                    description: 'Expense category (Food & Drink, Groceries, Travel, Shopping, Utilities, Other)',
                                    nullable: false,
                                },
                                lineItems: {
                                    type: SchemaType.ARRAY,
                                    description: 'Individual items from the receipt',
                                    items: {
                                        type: SchemaType.OBJECT,
                                        properties: {
                                            description: {
                                                type: SchemaType.STRING,
                                                description: 'Item description',
                                                nullable: false,
                                            },
                                            quantity: {
                                                type: SchemaType.NUMBER,
                                                description: 'Item quantity',
                                                nullable: false,
                                            },
                                            price: {
                                                type: SchemaType.NUMBER,
                                                description: 'Item price',
                                                nullable: false,
                                            },
                                        },
                                        required: ['description', 'quantity', 'price'],
                                    },
                                    nullable: false,
                                },
                            },
                            required: ['merchant', 'date', 'total', 'category', 'lineItems'],
                        },
                    },
                });

                const { mimeType, imageData } = this.parseBase64Image(base64Image);

                const result = await model.generateContent([
                    this.getSystemInstruction(),
                    {
                        inlineData: {
                            mimeType: `image/${mimeType}`,
                            data: imageData,
                        },
                    },
                ]);

                const response = result.response;
                const text = response.text();
                const expenseData = JSON.parse(text);

                console.log(`[GeminiProvider] Success with ${keyLabel} API key`);
                
                return {
                    success: true,
                    data: expenseData,
                };
            } catch (error: any) {
                console.error(`[GeminiProvider] Error with ${keyLabel} API key:`, error);
                lastError = error;
                
                // If this is a rate limit error and we have more keys to try, continue
                if (this.isRateLimitError(error) && i < this.apiKeys.length - 1) {
                    console.log(`[GeminiProvider] Rate limit detected, trying next API key...`);
                    continue;
                }
                
                // If it's not a rate limit error, or we've exhausted all keys, break
                if (!this.isRateLimitError(error)) {
                    console.log(`[GeminiProvider] Non-rate-limit error, not retrying`);
                    break;
                }
            }
        }

        // All attempts failed
        console.error('[GeminiProvider] All API keys exhausted');
        return {
            success: false,
            error: lastError?.message || 'Failed to process receipt',
        };
    }
}
