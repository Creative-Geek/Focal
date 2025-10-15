import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { BaseAIProvider, AIResponse } from './base.service';

/**
 * Google Gemini AI Provider
 * Supports: gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite
 */
export class GeminiProvider extends BaseAIProvider {
    private apiKey: string;
    private modelName: string;

    constructor(apiKey: string, modelName: string = 'gemini-2.5-flash') {
        super();
        this.apiKey = apiKey;
        this.modelName = modelName;
    }

    async processReceipt(base64Image: string): Promise<AIResponse> {
        try {
            const genAI = new GoogleGenerativeAI(this.apiKey);

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

            return {
                success: true,
                data: expenseData,
            };
        } catch (error: any) {
            console.error('Gemini API error:', error);
            return {
                success: false,
                error: error.message || 'Failed to process receipt',
            };
        }
    }
}
