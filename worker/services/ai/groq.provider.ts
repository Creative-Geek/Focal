import { BaseAIProvider, AIResponse } from './base.service';
import { OcrService } from '../ocr.service';

export const DEFAULT_GROQ_VISION_MODEL = 'qwen/qwen3.8-27b';
export const LEGACY_GROQ_OCR_MODEL = 'openai/gpt-oss-20b';

/**
 * Groq Provider
 * Default path: Direct multimodal vision using qwen/qwen3.8-27b with reasoning enabled.
 * Legacy path (retained, not called): Two-stage Azure OCR + Groq text LLM structuring.
 */
export class GroqProvider extends BaseAIProvider {
    private groqApiKeys: string[];
    private modelName: string;
    private azureEndpoint?: string;
    private azureApiKey?: string;

    constructor(
        groqApiKeys: string | string[],
        modelName: string = DEFAULT_GROQ_VISION_MODEL,
        azureEndpoint?: string,
        azureApiKey?: string
    ) {
        super();
        // Support both single key (backward compatible) and array of keys
        this.groqApiKeys = Array.isArray(groqApiKeys) ? groqApiKeys : [groqApiKeys];
        this.modelName = modelName;
        this.azureEndpoint = azureEndpoint;
        this.azureApiKey = azureApiKey;
    }

    /**
     * Process a receipt image directly using Groq vision (qwen/qwen3.8-27b)
     */
    async processReceipt(base64Image: string): Promise<AIResponse> {
        return this.processReceiptWithVision(base64Image);
    }

    /**
     * Direct vision extraction via Groq (qwen/qwen3.8-27b) with reasoning enabled
     * and generous completion token headroom for reasoning + JSON output.
     */
    private async processReceiptWithVision(base64Image: string): Promise<AIResponse> {
        try {
            const { imageData, mimeType } = this.parseBase64Image(base64Image);

            const systemPrompt = `${this.getSystemInstruction()}

Return ONLY a valid JSON object matching this exact structure (no markdown code fences or extra text):
{
  "merchant": "Store Name",
  "date": "YYYY-MM-DD",
  "total": 123.45,
  "category": "Food & Drink",
  "lineItems": [
    {
      "description": "Item name",
      "quantity": 1,
      "price": 10.00
    }
  ]
}`;

            console.log('[Groq Provider] Starting direct vision processing with model:', this.modelName);

            const expenseData = await this.executeWithFallback(
                this.groqApiKeys,
                async (groqApiKey) => {
                    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${groqApiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: this.modelName,
                            messages: [
                                {
                                    role: 'system',
                                    content: systemPrompt,
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
                            temperature: 0.2,
                            // Full output budget for qwen/qwen3.8-27b so reasoning tokens + JSON never truncate
                            max_completion_tokens: 16384,
                            reasoning_effort: 'medium',
                            reasoning_format: 'hidden',
                            // Groq qwen/qwen3.8-27b supports json_mode (json_object), not strict json_schema
                            response_format: {
                                type: 'json_object',
                            },
                        }),
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
                    }

                    const result: any = await response.json();
                    const choice = result.choices?.[0];
                    const content = choice?.message?.content;

                    if (choice?.finish_reason === 'length') {
                        throw new Error('Groq response reached token limit before finishing JSON output');
                    }

                    if (!content) {
                        throw new Error('No response from Groq API');
                    }

                    return this.parseExpenseResponse(content);
                },
                'Groq Provider'
            );

            return {
                success: true,
                data: expenseData,
            };
        } catch (error: any) {
            console.error('[Groq Provider] Vision error:', error);
            return {
                success: false,
                error: error.message || 'Failed to process receipt',
            };
        }
    }

    /**
     * Legacy two-stage hybrid path (Azure OCR + Groq LLM structuring).
     * Retained in codebase for reference / future self-hosted OCR integration, not called by default.
     */
    async processReceiptWithOcr(
        base64Image: string,
        llmModelName: string = LEGACY_GROQ_OCR_MODEL
    ): Promise<AIResponse> {
        try {
            if (!this.azureEndpoint || !this.azureApiKey) {
                return {
                    success: false,
                    error: 'OCR credentials not configured for legacy hybrid Groq path',
                };
            }

            console.log('[Groq Provider] Starting legacy OCR + LLM receipt processing...');
            console.log('[Groq Provider] Azure endpoint:', this.azureEndpoint);
            console.log('[Groq Provider] Model:', llmModelName);

            // Step 1: Extract text using Azure OCR
            const ocrService = new OcrService(this.azureEndpoint, this.azureApiKey);
            const ocrResult = await ocrService.extractText(base64Image);

            console.log('[Groq Provider] OCR result:', ocrResult.success ? 'Success' : 'Failed');

            if (!ocrResult.success) {
                console.error('[Groq Provider] OCR failed:', ocrResult.error);
                return {
                    success: false,
                    error: ocrResult.error || 'OCR extraction failed',
                };
            }

            console.log('[Groq Provider] OCR text length:', ocrResult.text.length);
            console.log('[Groq Provider] Calling Groq LLM for structuring...');

            // Step 2: Structure the OCR text using Groq LLM (with fallback)
            const structuredData = await this.structureWithGroq(ocrResult.text, llmModelName);

            console.log('[Groq Provider] Structuring result:', structuredData.success ? 'Success' : 'Failed');

            return structuredData;
        } catch (error: any) {
            console.error('Groq provider legacy OCR error:', error);
            return {
                success: false,
                error: error.message || 'Failed to process receipt',
            };
        }
    }

    /**
     * Structure OCR text using Groq LLM with JSON mode (used by legacy hybrid OCR path)
     */
    private async structureWithGroq(ocrText: string, llmModelName: string): Promise<AIResponse> {
        try {
            const currentDate = this.getCurrentDate();

            const systemPrompt = `You are an expert AI data extraction assistant.

Your task is to analyze the provided OCR text from a receipt and extract the specified information.
You must format your response as a single, valid JSON object that strictly adheres to the provided schema.

**Constraints:**
1. **Strict Schema:** Only output the JSON object. Do not add any explanatory text, markdown formatting, or "\`\`\`json" tags before or after the JSON.
2. **Date Format:** The date must be in YYYY-MM-DD format. If the year is not specified, use ${currentDate.split('-')[0]} (current year).
3. **Numeric Fields:** "total", "quantity", and "price" must be numbers (float or int), not strings. Do not include currency symbols ($, €, etc.).
4. **Category Inference:** Analyze the merchant name and the line items to determine the most appropriate category from: ["Food & Drink", "Groceries", "Travel", "Shopping", "Utilities", "Other"].
5. **Line Items:**
   - Extract all individual items listed.
   - If quantity is not explicitly mentioned, assume quantity is 1.0.
   - If quantity is specified (e.g., "2x Item"), use that quantity.
   - The "price" for a line item MUST be the unit price for a single unit (so quantity * price equals the line subtotal). If only the line total is shown for quantity > 1, divide it by quantity.
6. **OCR Messiness:** The text will be "dirty" from OCR. Do your best to interpret misspelled words, cut off words, and fragmented lines.
7. **Total:** The "total" field must be the final amount paid, usually labeled "TOTAL", "AMOUNT", or similar.

If the date is unclear or not visible, use ${currentDate} (today's date).
If lineItems are not visible or unclear, return an empty array.`;

            const userPrompt = `Please extract the information from the following receipt text according to the schema.

Receipt text:
${ocrText}

Extract the merchant, date, total, category, and line items. Return ONLY a valid JSON object with this structure:
{
  "merchant": "Store Name",
  "date": "YYYY-MM-DD",
  "total": 123.45,
  "category": "Food & Drink",
  "lineItems": [
    {
      "description": "Item name",
      "quantity": 1.0,
      "price": 10.00
    }
  ]
}`;

            console.log('[Groq Provider] Making Groq API call...');
            console.log('[Groq Provider] OCR text preview:', ocrText.substring(0, 200));

            const expenseData = await this.executeWithFallback(
                this.groqApiKeys,
                async (groqApiKey) => {
                    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${groqApiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: llmModelName,
                            messages: [
                                {
                                    role: 'system',
                                    content: systemPrompt,
                                },
                                {
                                    role: 'user',
                                    content: userPrompt,
                                },
                            ],
                            temperature: 0.2,
                            max_tokens: 4000,
                            response_format: {
                                type: 'json_object',
                            },
                        }),
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
                    }

                    const result: any = await response.json();
                    const content = result.choices?.[0]?.message?.content;

                    if (!content) {
                        throw new Error('No response from Groq API');
                    }

                    return this.parseExpenseResponse(content);
                },
                'Groq Provider'
            );

            return {
                success: true,
                data: expenseData,
            };
        } catch (error: any) {
            console.error('[Groq Provider] Structuring error:', error);
            return {
                success: false,
                error: error.message || 'Failed to structure receipt data',
            };
        }
    }
}
