import { Hono } from "hono";
import { getAgentByName } from 'agents';
import { ChatAgent } from './agent';
import { API_RESPONSES } from './config';
import { Env, getAppController, registerSession, unregisterSession } from "./core-utils";
import { Expense } from "./types";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
/**
 * DO NOT MODIFY THIS FUNCTION. Only for your reference.
 */
export function coreRoutes(app: Hono<{ Bindings: Env }>) {
    // Use this API for conversations. **DO NOT MODIFY**
    app.all('/api/chat/:sessionId/*', async (c) => {
        try {
        const sessionId = c.req.param('sessionId');
        const agent = await getAgentByName<Env, ChatAgent>(c.env.CHAT_AGENT, sessionId); // Get existing agent or create a new one if it doesn't exist, with sessionId as the name
        const url = new URL(c.req.url);
        url.pathname = url.pathname.replace(`/api/chat/${sessionId}`, '');
        return agent.fetch(new Request(url.toString(), {
            method: c.req.method,
            headers: c.req.header(),
            body: c.req.method === 'GET' || c.req.method === 'DELETE' ? undefined : c.req.raw.body
        }));
        } catch (error) {
        console.error('Agent routing error:', error);
        return c.json({
            success: false,
            error: API_RESPONSES.AGENT_ROUTING_FAILED
        }, { status: 500 });
        }
    });
}
export function userRoutes(app: Hono<{ Bindings: Env }>) {
    // Add your routes here
    /**
     * List all chat sessions
     * GET /api/sessions
     */
    app.get('/api/sessions', async (c) => {
        try {
            const controller = getAppController(c.env);
            const sessions = await controller.listSessions();
            return c.json({ success: true, data: sessions });
        } catch (error) {
            console.error('Failed to list sessions:', error);
            return c.json({
                success: false,
                error: 'Failed to retrieve sessions'
            }, { status: 500 });
        }
    });
    /**
     * Create a new chat session
     * POST /api/sessions
     * Body: { title?: string, sessionId?: string }
     */
    app.post('/api/sessions', async (c) => {
        try {
            const body = await c.req.json().catch(() => ({}));
            const { title, sessionId: providedSessionId, firstMessage } = body;
            const sessionId = providedSessionId || crypto.randomUUID();
            // Generate better session titles
            let sessionTitle = title;
            if (!sessionTitle) {
                const now = new Date();
                const dateTime = now.toLocaleString([], {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                if (firstMessage && firstMessage.trim()) {
                    const cleanMessage = firstMessage.trim().replace(/\s+/g, ' ');
                    const truncated = cleanMessage.length > 40
                        ? cleanMessage.slice(0, 37) + '...'
                        : cleanMessage;
                    sessionTitle = `${truncated} • ${dateTime}`;
                } else {
                    sessionTitle = `Chat ${dateTime}`;
                }
            }
            await registerSession(c.env, sessionId, sessionTitle);
            return c.json({
                success: true,
                data: { sessionId, title: sessionTitle }
            });
        } catch (error) {
            console.error('Failed to create session:', error);
            return c.json({
                success: false,
                error: 'Failed to create session'
            }, { status: 500 });
        }
    });
    /**
     * Delete a chat session
     * DELETE /api/sessions/:sessionId
     */
    app.delete('/api/sessions/:sessionId', async (c) => {
        try {
            const sessionId = c.req.param('sessionId');
            const deleted = await unregisterSession(c.env, sessionId);
            if (!deleted) {
                return c.json({
                    success: false,
                    error: 'Session not found'
                }, { status: 404 });
            }
            return c.json({ success: true, data: { deleted: true } });
        } catch (error) {
            console.error('Failed to delete session:', error);
            return c.json({
                success: false,
                error: 'Failed to delete session'
            }, { status: 500 });
        }
    });
    /**
     * Update session title
     * PUT /api/sessions/:sessionId/title
     * Body: { title: string }
     */
    app.put('/api/sessions/:sessionId/title', async (c) => {
        try {
            const sessionId = c.req.param('sessionId');
            const { title } = await c.req.json();
            if (!title || typeof title !== 'string') {
                return c.json({
                    success: false,
                    error: 'Title is required'
                }, { status: 400 });
            }
            const controller = getAppController(c.env);
            const updated = await controller.updateSessionTitle(sessionId, title);
            if (!updated) {
                return c.json({
                    success: false,
                    error: 'Session not found'
                }, { status: 404 });
            }
            return c.json({ success: true, data: { title } });
        } catch (error) {
            console.error('Failed to update session title:', error);
            return c.json({
                success: false,
                error: 'Failed to update session title'
            }, { status: 500 });
        }
    });
    /**
     * Get session count and stats
     * GET /api/sessions/stats
     */
    app.get('/api/sessions/stats', async (c) => {
        try {
            const controller = getAppController(c.env);
            const count = await controller.getSessionCount();
            return c.json({
                success: true,
                data: { totalSessions: count }
            });
        } catch (error) {
            console.error('Failed to get session stats:', error);
            return c.json({
                success: false,
                error: 'Failed to retrieve session stats'
            }, { status: 500 });
        }
    });
    /**
     * Clear all chat sessions
     * DELETE /api/sessions
     */
    app.delete('/api/sessions', async (c) => {
        try {
            const controller = getAppController(c.env);
            const deletedCount = await controller.clearAllSessions();
            return c.json({
                success: true,
                data: { deletedCount }
            });
        } catch (error) {
            console.error('Failed to clear all sessions:', error);
            return c.json({
                success: false,
                error: 'Failed to clear all sessions'
            }, { status: 500 });
        }
    });
    // Focal Finance Tracker Routes
    app.post('/api/process-receipt', async (c) => {
        try {
            const { image, apiKey: clientApiKey } = await c.req.json<{ image: string; apiKey?: string }>();
            if (!image) {
                return c.json({ success: false, error: 'Image data is required' }, { status: 400 });
            }
            const serverApiKey = c.env.CF_AI_API_KEY;
            const effectiveApiKey = clientApiKey || serverApiKey;
            if (!effectiveApiKey || effectiveApiKey === 'your-cloudflare-api-key') {
                return c.json({
                    success: false,
                    error: 'AI API key is missing. Please configure your Google AI API key in the application settings to proceed.'
                }, { status: 401 }); // 401 Unauthorized
            }
            const genAI = new GoogleGenerativeAI(effectiveApiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                systemInstruction: `You are an expert receipt processing AI. Extract the following information from the user's receipt image and return it as a valid JSON object. The JSON schema should be: { "merchant": string, "date": "YYYY-MM-DD", "total": number, "currency": "USD" | "EUR" | "GBP" | etc., "category": "Food & Drink" | "Groceries" | "Travel" | "Shopping" | "Utilities" | "Other", "lineItems": [{ "description": string, "quantity": number, "price": number }] }. If a value is not clear, make a reasonable guess or use a placeholder. Ensure the total is a number. Respond ONLY with the JSON object.`,
                generationConfig: { responseMimeType: "application/json" },
            });
            const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.*)$/);
            if (!match) {
                return c.json({ success: false, error: 'Invalid image format. Only JPEG, PNG, and WEBP are supported.' }, { status: 400 });
            }
            const [, mimeType, base64Data] = match;
            const imagePart = { inlineData: { mimeType, data: base64Data } };
            const result = await model.generateContent(["Extract the receipt data as JSON.", imagePart]);
            const response = result.response;
            const text = response.text();
            const parsedData = JSON.parse(text);
            return c.json({ success: true, data: parsedData });
        } catch (error: any) {
            console.error('Error processing receipt:', error);
            let errorMessage = 'An unexpected error occurred while processing the receipt.';
            if (error.message.includes('API key not valid')) {
                errorMessage = 'The provided Google AI API key is invalid. Please check your key in the settings.';
            } else if (error.message) {
                errorMessage = `The AI service returned an error: ${error.message}`;
            }
            return c.json({ success: false, error: errorMessage }, { status: 500 });
        }
    });
    // NOTE: /api/expenses routes are no longer used by the client but are kept for potential future server-side features.
    app.get('/api/expenses', async (c) => {
        try {
            const controller = getAppController(c.env);
            const expenses = await controller.listExpenses();
            return c.json({ success: true, data: expenses });
        } catch (error) {
            console.error('Failed to list expenses:', error);
            return c.json({ success: false, error: 'Failed to retrieve expenses' }, { status: 500 });
        }
    });
    app.post('/api/expenses', async (c) => {
        try {
            const expense = await c.req.json<Omit<Expense, 'id'>>();
            const newExpense: Expense = { ...expense, id: crypto.randomUUID() };
            const controller = getAppController(c.env);
            await controller.addExpense(newExpense);
            return c.json({ success: true, data: newExpense });
        } catch (error) {
            console.error('Failed to save expense:', error);
            return c.json({ success: false, error: 'Failed to save expense' }, { status: 500 });
        }
    });
}