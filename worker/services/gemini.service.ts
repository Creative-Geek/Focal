import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Google Gemini AI service for receipt processing
 */
export class GeminiService {
    /**
     * Process a receipt image and extract expense data
     */
    async processReceipt(apiKey: string, base64Image: string): Promise<any> {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                responseMimeType: 'application/json',
            },
        });

        const systemInstruction = `You are a receipt data extraction assistant. Extract the following information from receipt images:
- merchant: Store/restaurant name
- date: Transaction date in YYYY-MM-DD format
- total: Total amount (number only, no currency symbols)
- currency: ISO 4217 currency code (USD, EUR, GBP, JPY, CAD, EGP, SAR)
- category: One of: Food & Drink, Groceries, Travel, Shopping, Utilities, Other
- lineItems: Array of items with description, quantity, and price

Return ONLY valid JSON matching this schema:
{
  "merchant": "string",
  "date": "YYYY-MM-DD",
  "total": number,
  "currency": "USD|EUR|GBP|JPY|CAD|EGP|SAR",
  "category": "Food & Drink|Groceries|Travel|Shopping|Utilities|Other",
  "lineItems": [
    {
      "description": "string",
      "quantity": number,
      "price": number
    }
  ]
}

If currency is invalid or unclear, default to "USD".
If date is unclear, use today's date.
If lineItems are not visible, return an empty array.`;

        try {
            // Extract mime type and data from base64 string
            const match = base64Image.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/);
            if (!match) {
                throw new Error('Invalid image format. Expected data:image/{type};base64,{data}');
            }

            const mimeType = match[1] === 'jpg' ? 'jpeg' : match[1];
            const imageData = match[2];

            const result = await model.generateContent([
                systemInstruction,
                {
                    inlineData: {
                        mimeType: `image/${mimeType}`,
                        data: imageData,
                    },
                },
            ]);

            const response = result.response;
            const text = response.text();

            // Parse JSON response
            const expenseData = JSON.parse(text);

            // Validate currency code
            const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'EGP', 'SAR'];
            if (!validCurrencies.includes(expenseData.currency)) {
                expenseData.currency = 'USD';
            }

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
