import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

/**
 * Audio Service for processing voice notes using Gemini
 */
export class AudioService {
    /**
     * Process an audio file and extract receipt data
     */
    async processAudio(apiKey: string, audioData: ArrayBuffer, mimeType: string): Promise<any> {
        const genAI = new GoogleGenerativeAI(apiKey);

        // Get current date in YYYY-MM-DD format for the prompt
        const currentDate = new Date().toISOString().split('T')[0];

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        receipts: {
                            type: SchemaType.ARRAY,
                            items: {
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
                    },
                    required: ['receipts'],
                },
            },
        });

        const systemInstruction = `You are an expert receipt extraction assistant. Your task is to analyze audio recordings where users describe their purchases or read out receipt details.

From the audio, you must extract ALL receipts mentioned and structure each one according to the provided schema.

Key guidelines:
- Listen carefully for merchant names, dates, items purchased, quantities, and prices
- If multiple receipts are mentioned in the audio, extract each one separately
- Infer the transaction date from context clues (e.g., "yesterday", "last Monday", "this morning"). If date is unclear, use ${currentDate}.
- Assign appropriate categories based on merchant type and items mentioned (Food & Drink, Groceries, Travel, Shopping, Utilities, Other)
- If prices aren't explicitly stated, use your best judgment based on typical market prices
- If quantity isn't mentioned, assume 1
- Be thorough and extract every receipt mentioned in the audio
- Provide the final output in the same language as the audio

Return a list of all receipts found in the audio.`;

        try {
            // Convert ArrayBuffer to base64
            const base64Audio = btoa(
                new Uint8Array(audioData).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            const result = await model.generateContent([
                systemInstruction,
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Audio,
                    },
                },
            ]);

            const response = result.response;
            const text = response.text();

            // Parse JSON response
            const parsedData = JSON.parse(text);

            return {
                success: true,
                data: parsedData.receipts || [],
            };
        } catch (error: any) {
            console.error('Audio processing error:', error);
            return {
                success: false,
                error: error.message || 'Failed to process audio',
            };
        }
    }
}
