import { Context } from 'hono';
import { Env } from '../types';
import { DBService } from '../services/db.service';
import { EncryptionService } from '../services/encryption.service';
import { GeminiService } from '../services/gemini.service';
import { validateRequest, processReceiptSchema } from '../utils/validation';
import { success, error, json } from '../utils/response';

type Variables = {
    userId: string;
    userEmail: string;
    token: string;
};

/**
 * POST /api/receipts/process
 * Process a receipt image using the user's Gemini API key
 */
export async function processReceipt(c: Context<{ Bindings: Env; Variables: Variables }>) {
    const env = c.env;
    const userId = c.get('userId');
    const dbService = new DBService(env.DB);
    const encryptionService = new EncryptionService(env.ENCRYPTION_KEY);
    const geminiService = new GeminiService();

    // Validate request body
    const validation = await validateRequest(c.req.raw, processReceiptSchema);
    if (!validation.success) {
        return error(validation.error, 400);
    }

    const { image } = validation.data;

    // Get user's API key
    const apiKeyRecord = await dbService.getApiKey(userId);
    if (!apiKeyRecord || !apiKeyRecord.encrypted_key) {
        return error('API key not configured. Please add your Gemini API key in settings.', 400);
    }

    // Decrypt the API key
    const apiKey = await encryptionService.decrypt(apiKeyRecord.encrypted_key);
    if (!apiKey) {
        return error('Failed to decrypt API key', 500);
    }

    // Process the receipt with Gemini
    const result = await geminiService.processReceipt(apiKey, image);

    if (!result.success) {
        return error(result.error || 'Failed to process receipt', 500);
    }

    // Add user's default currency to the response
    const expenseData = {
        ...result.data,
        currency: apiKeyRecord.default_currency || 'USD',
    };

    return json(success(expenseData));
}
