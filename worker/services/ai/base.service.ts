/**
 * Base AI Service Interface
 * All AI providers must implement this interface to ensure consistent behavior
 */

export interface ExpenseData {
    merchant: string;
    date: string; // YYYY-MM-DD format
    total: number;
    category: 'Food & Drink' | 'Groceries' | 'Travel' | 'Shopping' | 'Utilities' | 'Other';
    lineItems: LineItem[];
}

export interface LineItem {
    description: string;
    quantity: number;
    price: number;
}

export interface AIResponse {
    success: boolean;
    data?: ExpenseData;
    error?: string;
}

/**
 * Abstract base class for AI providers
 */
export abstract class BaseAIProvider {
    /**
     * Process a receipt image and extract expense data
     * @param base64Image - Base64 encoded image with data URI prefix (data:image/{type};base64,{data})
     * @returns Promise with structured expense data
     */
    abstract processReceipt(base64Image: string): Promise<AIResponse>;

    /**
     * Get the current date in YYYY-MM-DD format for the prompt
     */
    protected getCurrentDate(): string {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Extract mime type and data from base64 string
     */
    protected parseBase64Image(base64Image: string): { mimeType: string; imageData: string } {
        const match = base64Image.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/);
        if (!match) {
            throw new Error('Invalid image format. Expected data:image/{type};base64,{data}');
        }

        const mimeType = match[1] === 'jpg' ? 'jpeg' : match[1];
        const imageData = match[2];

        return { mimeType, imageData };
    }

    /**
     * Get the system instruction for receipt processing
     */
    protected getSystemInstruction(): string {
        const currentDate = this.getCurrentDate();
        return `You are a receipt data extraction assistant. Extract the following information from receipt images:
- merchant: Store/restaurant name
- date: Transaction date in YYYY-MM-DD format
- total: Total amount (number only, no currency symbols or codes)
- category: One of: Food & Drink, Groceries, Travel, Shopping, Utilities, Other
- lineItems: Array of items with description, quantity, and price

Important:
- Extract the raw numeric total value without any currency symbols
- If date is unclear or not visible, use ${currentDate} (today's date: ${currentDate})
- If lineItems are not visible or unclear, return an empty array
- All fields are required and must match the schema`;
    }
}
