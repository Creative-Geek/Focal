import { Context } from 'hono';
import { Env } from '../types';
import { DBService } from '../services/db.service';
import { EncryptionService } from '../services/encryption.service';
import { validateRequest, apiKeySchema } from '../utils/validation';
import { success, error, json } from '../utils/response';

type Variables = {
    userId: string;
    userEmail: string;
    token: string;
};

/**
 * GET /api/settings/api-key
 * Check if user has an API key configured
 */
export async function getApiKeyStatus(c: Context<{ Bindings: Env; Variables: Variables }>) {
    const env = c.env;
    const userId = c.get('userId');
    const dbService = new DBService(env.DB);

    const apiKey = await dbService.getApiKey(userId);

    return json(
        success({
            hasApiKey: !!apiKey,
            defaultCurrency: apiKey?.default_currency || 'USD',
        })
    );
}

/**
 * PUT /api/settings/api-key
 * Save or update user's encrypted API key
 */
export async function saveApiKey(c: Context<{ Bindings: Env; Variables: Variables }>) {
    const env = c.env;
    const userId = c.get('userId');
    const dbService = new DBService(env.DB);
    const encryptionService = new EncryptionService(env.ENCRYPTION_KEY);

    // Validate request body
    const validation = await validateRequest(c.req.raw, apiKeySchema);
    if (!validation.success) {
        return error(validation.error, 400);
    }

    const { apiKey, defaultCurrency } = validation.data;

    // Encrypt the API key
    const encryptedKey = await encryptionService.encrypt(apiKey);

    // Save to database
    const apiKeyId = crypto.randomUUID();
    await dbService.saveApiKey(apiKeyId, userId, encryptedKey, defaultCurrency || 'USD');

    return json(success({ message: 'API key saved successfully' }));
}

/**
 * DELETE /api/settings/api-key
 * Remove user's API key
 */
export async function deleteApiKey(c: Context<{ Bindings: Env; Variables: Variables }>) {
    const env = c.env;
    const userId = c.get('userId');
    const dbService = new DBService(env.DB);

    await dbService.deleteApiKey(userId);

    return json(success({ message: 'API key deleted successfully' }));
}

/**
 * GET /api/settings/currency
 * Get user's default currency
 */
export async function getCurrency(c: Context<{ Bindings: Env; Variables: Variables }>) {
    const env = c.env;
    const userId = c.get('userId');
    const dbService = new DBService(env.DB);

    const apiKey = await dbService.getApiKey(userId);

    return json(
        success({
            defaultCurrency: apiKey?.default_currency || 'USD',
        })
    );
}

/**
 * PUT /api/settings/currency
 * Update user's default currency
 */
export async function updateCurrency(c: Context<{ Bindings: Env; Variables: Variables }>) {
    const env = c.env;
    const userId = c.get('userId');
    const dbService = new DBService(env.DB);

    try {
        const body = await c.req.json();
        const { defaultCurrency } = body;

        if (!defaultCurrency || typeof defaultCurrency !== 'string') {
            return error('Invalid currency', 400);
        }

        // Get existing API key record
        const apiKey = await dbService.getApiKey(userId);
        if (!apiKey) {
            // Create a placeholder API key record with empty encrypted key
            const encryptionService = new EncryptionService(env.ENCRYPTION_KEY);
            const emptyEncrypted = await encryptionService.encrypt('');
            const apiKeyId = crypto.randomUUID();
            await dbService.saveApiKey(apiKeyId, userId, emptyEncrypted, defaultCurrency);
        } else {
            // Update existing record
            await dbService.saveApiKey(apiKey.id, userId, apiKey.encrypted_key, defaultCurrency);
        }

        return json(success({ message: 'Currency updated successfully', defaultCurrency }));
    } catch (err) {
        return error('Invalid request body', 400);
    }
}
