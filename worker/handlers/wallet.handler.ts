import { Context } from 'hono';
import { Env } from '../types';
import { DBService } from '../services/db.service';
import { validateRequest } from '../utils/validation';
import { success, error, json, notFound } from '../utils/response';
import { z } from 'zod';

type Variables = {
    userId: string;
    userEmail: string;
    token: string;
};

// Validation schema for wallet
const walletSchema = z.object({
    name: z.string().min(1, 'Wallet name is required').max(100, 'Wallet name too long'),
    initialBalance: z.number().min(0, 'Initial balance must be non-negative'),
    currency: z.string().min(3, 'Currency code required').max(3, 'Invalid currency code'),
});

/**
 * GET /api/wallets
 * Get all wallets for the current user
 */
export async function getWallets(c: Context<{ Bindings: Env; Variables: Variables }>) {
    const env = c.env;
    const userId = c.get('userId');
    const dbService = new DBService(env.DB);

    const wallets = await dbService.getWalletsByUserId(userId);

    return json(success(wallets));
}

/**
 * GET /api/wallets/:id
 * Get a single wallet by ID
 */
export async function getWalletById(c: Context<{ Bindings: Env; Variables: Variables }>) {
    const env = c.env;
    const userId = c.get('userId');
    const walletId = c.req.param('id');
    const dbService = new DBService(env.DB);

    const wallet = await dbService.getWalletById(walletId, userId);
    if (!wallet) {
        return notFound('Wallet not found');
    }

    return json(success(wallet));
}

/**
 * POST /api/wallets
 * Create a new wallet
 */
export async function createWallet(c: Context<{ Bindings: Env; Variables: Variables }>) {
    const env = c.env;
    const userId = c.get('userId');
    const dbService = new DBService(env.DB);

    // Validate request body
    const validation = await validateRequest(c.req.raw, walletSchema);
    if (!validation.success) {
        return error(validation.error, 400);
    }

    const { name, initialBalance, currency } = validation.data;

    // Create wallet
    const walletId = crypto.randomUUID();
    const wallet = await dbService.createWallet({
        id: walletId,
        user_id: userId,
        name,
        initial_balance: initialBalance,
        current_balance: initialBalance,
        currency,
    });

    return json(success(wallet), 201);
}

/**
 * PUT /api/wallets/:id
 * Update an existing wallet
 */
export async function updateWallet(c: Context<{ Bindings: Env; Variables: Variables }>) {
    const env = c.env;
    const userId = c.get('userId');
    const walletId = c.req.param('id');
    const dbService = new DBService(env.DB);

    // Check if wallet exists and belongs to user
    const existingWallet = await dbService.getWalletById(walletId, userId);
    if (!existingWallet) {
        return notFound('Wallet not found');
    }

    // Validate request body (all fields optional for update)
    const updateSchema = z.object({
        name: z.string().min(1).max(100).optional(),
        initialBalance: z.number().min(0).optional(),
        currency: z.string().min(3).max(3).optional(),
    });

    const validation = await validateRequest(c.req.raw, updateSchema);
    if (!validation.success) {
        return error(validation.error, 400);
    }

    const { name, initialBalance, currency } = validation.data;

    // Calculate new current_balance if initial_balance changed
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (currency !== undefined) updates.currency = currency;
    if (initialBalance !== undefined) {
        updates.initial_balance = initialBalance;
        // Adjust current balance by the difference
        const difference = initialBalance - existingWallet.initial_balance;
        updates.current_balance = existingWallet.current_balance + difference;
    }

    // Update wallet
    await dbService.updateWallet(walletId, userId, updates);

    // Fetch updated wallet
    const updatedWallet = await dbService.getWalletById(walletId, userId);

    return json(success(updatedWallet));
}

/**
 * DELETE /api/wallets/:id
 * Delete a wallet
 */
export async function deleteWallet(c: Context<{ Bindings: Env; Variables: Variables }>) {
    const env = c.env;
    const userId = c.get('userId');
    const walletId = c.req.param('id');
    const dbService = new DBService(env.DB);

    // Check if wallet exists and belongs to user
    const wallet = await dbService.getWalletById(walletId, userId);
    if (!wallet) {
        return notFound('Wallet not found');
    }

    // Delete wallet
    await dbService.deleteWallet(walletId, userId);

    return json(success({ message: 'Wallet deleted successfully' }));
}
