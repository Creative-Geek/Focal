import { Context } from 'hono';
import { Env } from '../types';
import { DBService } from '../services/db.service';
import { RateLimitService } from '../services/rateLimit.service';
import { AIProviderFactory, AIProviderType } from '../services/ai/factory';
import { validateRequest, processReceiptSchema } from '../utils/validation';
import { success, error, json } from '../utils/response';

type Variables = {
    userId: string;
    userEmail: string;
    token: string;
};

// AI usage rate limit: 10 requests per day per user
const AI_RATE_LIMIT = {
    limit: 10,
    window: 24 * 60 * 60, // 24 hours in seconds
};

/**
 * POST /api/receipts/process
 * Process a receipt image using the configured AI provider
 */
export async function processReceipt(c: Context<{ Bindings: Env; Variables: Variables }>) {
    const env = c.env;
    const userId = c.get('userId');
    const dbService = new DBService(env.DB);

    // Validate request body
    const validation = await validateRequest(c.req.raw, processReceiptSchema);
    if (!validation.success) {
        return error(validation.error, 400);
    }

    const { image } = validation.data;

    // Check AI usage rate limit
    const rateLimitService = new RateLimitService(dbService, 'ai_receipt_processing', AI_RATE_LIMIT);
    const isAllowed = await rateLimitService.isAllowed(userId);

    if (!isAllowed) {
        // Get current usage for better error message
        const now = Date.now();
        const windowStart = now - AI_RATE_LIMIT.window * 1000;
        const recentRequests = await dbService.getRateLimitRequests('ai_receipt_processing', userId, windowStart);

        // Calculate reset time
        const oldestRequest = Math.min(...recentRequests.map(r => r.created_at));
        const resetAt = (oldestRequest + AI_RATE_LIMIT.window) * 1000;
        const hoursUntilReset = Math.ceil((resetAt - now) / (1000 * 60 * 60));

        return error(
            `Daily AI scan limit reached (10/10 used). Your quota will reset in approximately ${hoursUntilReset} hour${hoursUntilReset !== 1 ? 's' : ''}. Try again later!`,
            429
        );
    }

    // Get user's AI provider preference (fallback to env, then gemini)
    const userSettings = await dbService.getApiKey(userId);
    const providerType = (userSettings?.ai_provider || env.AI_PROVIDER || 'gemini') as AIProviderType;
    const modelName = env.AI_MODEL;

    console.log('[Receipt Handler] Selected provider:', providerType);
    console.log('[Receipt Handler] User setting:', userSettings?.ai_provider);
    console.log('[Receipt Handler] Env default:', env.AI_PROVIDER);

    try {
        // Get the appropriate API key for the provider
        const apiKey = AIProviderFactory.getApiKey(env, providerType);

        console.log('[Receipt Handler] Creating provider instance...');

        // Create AI provider instance (pass env for Groq provider Azure credentials)
        const aiProvider = AIProviderFactory.createProvider(providerType, apiKey, modelName, env);

        console.log('[Receipt Handler] Processing receipt with', providerType);

        // Process the receipt
        const result = await aiProvider.processReceipt(image);

        if (!result.success) {
            return error(result.error || 'Failed to process receipt', 500);
        }

        // Record the AI usage (only after successful processing)
        await rateLimitService.recordRequest(userId);

        // Get user's default currency (check api_keys table for backward compatibility)
        const apiKeyRecord = await dbService.getApiKey(userId);
        const defaultCurrency = apiKeyRecord?.default_currency || 'USD';

        // Add user's default currency to the response
        const expenseData = {
            ...result.data,
            currency: defaultCurrency,
        };

        return json(success(expenseData));
    } catch (err: any) {
        console.error('Receipt processing error:', err);
        return error(err.message || 'Failed to process receipt', 500);
    }
}

/**
 * GET /api/receipts/quota
 * Get the user's remaining AI usage quota
 */
export async function getAIQuota(c: Context<{ Bindings: Env; Variables: Variables }>) {
    const userId = c.get('userId');
    const dbService = new DBService(c.env.DB);

    try {
        const rateLimitService = new RateLimitService(dbService, 'ai_receipt_processing', AI_RATE_LIMIT);

        // Get current usage
        const now = Date.now();
        const windowStart = now - AI_RATE_LIMIT.window * 1000;
        const recentRequests = await dbService.getRateLimitRequests('ai_receipt_processing', userId, windowStart);

        const used = recentRequests.length;
        const remaining = Math.max(0, AI_RATE_LIMIT.limit - used);
        const limit = AI_RATE_LIMIT.limit;

        // Calculate reset time (24 hours from oldest request, or now if no requests)
        let resetAt: number;
        if (recentRequests.length > 0) {
            const oldestRequest = Math.min(...recentRequests.map(r => r.created_at));
            resetAt = (oldestRequest + AI_RATE_LIMIT.window) * 1000; // Convert to milliseconds
        } else {
            resetAt = now + AI_RATE_LIMIT.window * 1000;
        }

        return json(success({
            limit,
            used,
            remaining,
            resetAt,
            resetIn: Math.max(0, Math.ceil((resetAt - now) / 1000)), // Seconds until reset
        }));
    } catch (err: any) {
        console.error('Failed to get AI quota:', err);
        return error('Failed to retrieve AI usage quota', 500);
    }
}
