import { Env, User, Expense, LineItem, ApiKey, Session, Wallet } from '../types';

// ============ ADMIN ANALYTICS TYPES ============

export interface AdminStats {
    totalUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
    activeUsers7Days: number;
    totalExpenses: number;
    expensesToday: number;
    expensesThisWeek: number;
    expensesThisMonth: number;
    categoryBreakdown: { category: string; count: number }[];
    aiProviderBreakdown: { provider: string; count: number }[];
    currencyBreakdown: { currency: string; count: number }[];
}

export interface UserWithStats {
    id: string;
    email: string;
    created_at: number;
    email_verified: number;
    expenseCount: number;
    lastExpenseAt: number | null;
    settings: {
        currency: string;
        aiProvider: string;
    } | null;
}

export interface UserExpense extends Expense {
    lineItems: LineItem[];
}

/**
 * Database service for D1 operations
 */
export class DBService {
    constructor(private db: D1Database) { }

    // ============ USER OPERATIONS ============

    async createUser(id: string, email: string, passwordHash: string): Promise<User> {
        const now = Date.now();
        await this.db
            .prepare('INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
            .bind(id, email, passwordHash, now, now)
            .run();

        return {
            id,
            email,
            password_hash: passwordHash,
            created_at: now,
            updated_at: now,
        };
    }

    async getUserByEmail(email: string): Promise<User | null> {
        const result = await this.db
            .prepare('SELECT * FROM users WHERE email = ?')
            .bind(email)
            .first<User>();

        return result || null;
    }

    async getUserById(id: string): Promise<User | null> {
        const result = await this.db
            .prepare('SELECT * FROM users WHERE id = ?')
            .bind(id)
            .first<User>();

        return result || null;
    }

    // ============ USER SETTINGS OPERATIONS ============
    // Note: The api_keys table is repurposed as user_settings.
    // The encrypted_key field is legacy and no longer used.

    async updateAIProvider(userId: string, aiProvider: string): Promise<void> {
        // Check if settings record exists
        const existing = await this.getUserSettings(userId);

        if (existing) {
            // Update existing record
            await this.db
                .prepare('UPDATE api_keys SET ai_provider = ? WHERE user_id = ?')
                .bind(aiProvider, userId)
                .run();
        } else {
            // Create new settings record
            const id = crypto.randomUUID();
            const now = Date.now();
            await this.db
                .prepare('INSERT INTO api_keys (id, user_id, encrypted_key, default_currency, ai_provider, created_at) VALUES (?, ?, ?, ?, ?, ?)')
                .bind(id, userId, '', 'EGP', aiProvider, now)
                .run();
        }
    }

    async updateCurrency(userId: string, currency: string): Promise<void> {
        // Check if settings record exists
        const existing = await this.getUserSettings(userId);

        if (existing) {
            // Update only the currency field
            await this.db
                .prepare('UPDATE api_keys SET default_currency = ? WHERE user_id = ?')
                .bind(currency, userId)
                .run();
        } else {
            // Create new settings record with default ai_provider
            const id = crypto.randomUUID();
            const now = Date.now();
            await this.db
                .prepare('INSERT INTO api_keys (id, user_id, encrypted_key, default_currency, ai_provider, created_at) VALUES (?, ?, ?, ?, ?, ?)')
                .bind(id, userId, '', currency, 'gemini', now)
                .run();
        }
    }

    async getUserSettings(userId: string): Promise<ApiKey | null> {
        const result = await this.db
            .prepare('SELECT * FROM api_keys WHERE user_id = ?')
            .bind(userId)
            .first<ApiKey>();

        return result || null;
    }

    // Legacy method - kept for backward compatibility
    async getApiKey(userId: string): Promise<ApiKey | null> {
        return this.getUserSettings(userId);
    }

    async deleteApiKey(userId: string): Promise<void> {
        await this.db
            .prepare('DELETE FROM api_keys WHERE user_id = ?')
            .bind(userId)
            .run();
    }

    // ============ EXPENSE OPERATIONS ============

    async createExpense(expense: Omit<Expense, 'created_at' | 'updated_at'>, lineItems: Array<{ description: string; quantity: number; price: number }>): Promise<Expense> {
        const now = Date.now();

        // Insert expense
        await this.db
            .prepare('INSERT INTO expenses (id, user_id, merchant, date, total, currency, category, wallet_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .bind(expense.id, expense.user_id, expense.merchant, expense.date, expense.total, expense.currency, expense.category, expense.wallet_id || null, now, now)
            .run();

        // Insert line items
        for (const item of lineItems) {
            const itemId = crypto.randomUUID();
            await this.db
                .prepare('INSERT INTO line_items (id, expense_id, description, quantity, price) VALUES (?, ?, ?, ?, ?)')
                .bind(itemId, expense.id, item.description, item.quantity, item.price)
                .run();
        }

        // Update wallet balance if wallet_id is provided
        if (expense.wallet_id) {
            const wallet = await this.getWalletById(expense.wallet_id, expense.user_id);
            if (wallet) {
                const newBalance = wallet.current_balance - expense.total;
                await this.updateWalletBalance(expense.wallet_id, expense.user_id, newBalance);
            }
        }

        return {
            ...expense,
            created_at: now,
            updated_at: now,
        };
    }

    async getExpensesByUserId(userId: string): Promise<Expense[]> {
        const result = await this.db
            .prepare('SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC, created_at DESC')
            .bind(userId)
            .all<Expense>();

        return result.results || [];
    }

    async getExpenseById(id: string, userId: string): Promise<Expense | null> {
        const result = await this.db
            .prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?')
            .bind(id, userId)
            .first<Expense>();

        return result || null;
    }

    async getLineItemsByExpenseId(expenseId: string): Promise<LineItem[]> {
        const result = await this.db
            .prepare('SELECT * FROM line_items WHERE expense_id = ?')
            .bind(expenseId)
            .all<LineItem>();

        return result.results || [];
    }

    async updateExpense(id: string, userId: string, updates: Partial<Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>>, lineItems?: Array<{ description: string; quantity: number; price: number }>): Promise<void> {
        const now = Date.now();

        // Get the existing expense to handle wallet balance updates
        const existingExpense = await this.getExpenseById(id, userId);
        if (!existingExpense) {
            throw new Error('Expense not found');
        }

        // Build dynamic UPDATE query
        const fields: string[] = [];
        const values: (string | number | null)[] = [];

        if (updates.merchant !== undefined) {
            fields.push('merchant = ?');
            values.push(updates.merchant);
        }
        if (updates.date !== undefined) {
            fields.push('date = ?');
            values.push(updates.date);
        }
        if (updates.total !== undefined) {
            fields.push('total = ?');
            values.push(updates.total);
        }
        if (updates.currency !== undefined) {
            fields.push('currency = ?');
            values.push(updates.currency);
        }
        if (updates.category !== undefined) {
            fields.push('category = ?');
            values.push(updates.category);
        }
        if (updates.wallet_id !== undefined) {
            fields.push('wallet_id = ?');
            values.push(updates.wallet_id || null);
        }

        fields.push('updated_at = ?');
        values.push(now);

        values.push(id, userId);

        await this.db
            .prepare(`UPDATE expenses SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`)
            .bind(...values)
            .run();

        // Handle wallet balance updates
        const newTotal = updates.total !== undefined ? updates.total : existingExpense.total;
        const oldWalletId = existingExpense.wallet_id;
        const newWalletId = updates.wallet_id !== undefined ? updates.wallet_id : existingExpense.wallet_id;

        // If wallet changed or total changed, update balances
        if (oldWalletId !== newWalletId || (newWalletId && updates.total !== undefined)) {
            // Restore balance to old wallet
            if (oldWalletId) {
                const oldWallet = await this.getWalletById(oldWalletId, userId);
                if (oldWallet) {
                    const restoredBalance = oldWallet.current_balance + existingExpense.total;
                    await this.updateWalletBalance(oldWalletId, userId, restoredBalance);
                }
            }

            // Deduct from new wallet
            if (newWalletId) {
                const newWallet = await this.getWalletById(newWalletId, userId);
                if (newWallet) {
                    const newBalance = newWallet.current_balance - newTotal;
                    await this.updateWalletBalance(newWalletId, userId, newBalance);
                }
            }
        }

        // Update line items if provided
        if (lineItems) {
            // Delete old line items
            await this.db
                .prepare('DELETE FROM line_items WHERE expense_id = ?')
                .bind(id)
                .run();

            // Insert new line items
            for (const item of lineItems) {
                const itemId = crypto.randomUUID();
                await this.db
                    .prepare('INSERT INTO line_items (id, expense_id, description, quantity, price) VALUES (?, ?, ?, ?, ?)')
                    .bind(itemId, id, item.description, item.quantity, item.price)
                    .run();
            }
        }
    }

    async deleteExpense(id: string, userId: string): Promise<void> {
        // Get the expense to restore wallet balance
        const expense = await this.getExpenseById(id, userId);

        if (expense && expense.wallet_id) {
            // Restore balance to wallet before deleting
            const wallet = await this.getWalletById(expense.wallet_id, userId);
            if (wallet) {
                const restoredBalance = wallet.current_balance + expense.total;
                await this.updateWalletBalance(expense.wallet_id, userId, restoredBalance);
            }
        }

        // Line items will be cascade deleted
        await this.db
            .prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?')
            .bind(id, userId)
            .run();
    }

    // ============ SESSION OPERATIONS ============

    async createSession(id: string, userId: string, token: string, expiresAt: number): Promise<void> {
        const now = Date.now();
        await this.db
            .prepare('INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
            .bind(id, userId, token, expiresAt, now)
            .run();
    }

    async getSessionByToken(token: string): Promise<Session | null> {
        const result = await this.db
            .prepare('SELECT * FROM sessions WHERE token = ?')
            .bind(token)
            .first<Session>();

        return result || null;
    }

    async deleteSession(token: string): Promise<void> {
        await this.db
            .prepare('DELETE FROM sessions WHERE token = ?')
            .bind(token)
            .run();
    }

    async deleteExpiredSessions(): Promise<void> {
        const now = Date.now();
        await this.db
            .prepare('DELETE FROM sessions WHERE expires_at < ?')
            .bind(now)
            .run();
    }

    // ============ EMAIL VERIFICATION OPERATIONS ============

    async setVerificationToken(userId: string, token: string, expiresAt: number): Promise<void> {
        await this.db
            .prepare('UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?')
            .bind(token, expiresAt, userId)
            .run();
    }

    async verifyEmail(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
        const now = Date.now();

        // Find user by verification token
        const user = await this.db
            .prepare('SELECT id, email, verification_token_expires, email_verified FROM users WHERE verification_token = ?')
            .bind(token)
            .first<{ id: string; email: string; verification_token_expires: number; email_verified: number }>();

        if (!user) {
            return { success: false, error: 'Invalid verification token' };
        }

        if (user.email_verified === 1) {
            return { success: false, error: 'Email already verified' };
        }

        if (user.verification_token_expires < now) {
            return { success: false, error: 'Verification token expired' };
        }

        // Mark email as verified and clear token
        await this.db
            .prepare('UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = ?')
            .bind(user.id)
            .run();

        return { success: true, userId: user.id };
    }

    async isEmailVerified(userId: string): Promise<boolean> {
        const result = await this.db
            .prepare('SELECT email_verified FROM users WHERE id = ?')
            .bind(userId)
            .first<{ email_verified: number }>();

        return result?.email_verified === 1;
    }

    async resendVerificationToken(userId: string, token: string, expiresAt: number): Promise<void> {
        await this.db
            .prepare('UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?')
            .bind(token, expiresAt, userId)
            .run();
    }

    // ============ PASSWORD RESET OPERATIONS ============

    async setResetToken(userId: string, token: string, expiresAt: number): Promise<void> {
        await this.db
            .prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?')
            .bind(token, expiresAt, userId)
            .run();
    }

    async verifyResetToken(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
        const now = Date.now();

        // Find user by reset token
        const user = await this.db
            .prepare('SELECT id, email, reset_token_expires FROM users WHERE reset_token = ?')
            .bind(token)
            .first<{ id: string; email: string; reset_token_expires: number }>();

        if (!user) {
            return { success: false, error: 'Invalid reset token' };
        }

        if (user.reset_token_expires < now) {
            return { success: false, error: 'Reset token expired' };
        }

        return { success: true, userId: user.id };
    }

    async updatePassword(userId: string, hashedPassword: string): Promise<void> {
        await this.db
            .prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?')
            .bind(hashedPassword, userId)
            .run();
    }

    // ============ RATE LIMITING OPERATIONS ============

    /**
     * Adds a record of a rate-limited action.
     * The `created_at` timestamp is automatically set by the database in seconds.
     */
    async addRateLimitRequest(action: string, identifier: string): Promise<void> {
        const id = crypto.randomUUID();
        await this.db
            .prepare('INSERT INTO rate_limits (id, action, identifier) VALUES (?, ?, ?)')
            .bind(id, action, identifier)
            .run();
    }

    /**
     * Retrieves recent requests for a given action and identifier.
     * @param windowStart - The start of the time window in milliseconds.
     * @returns A list of request timestamps.
     */
    async getRateLimitRequests(action: string, identifier: string, windowStart: number): Promise<{ created_at: number }[]> {
        // Convert window from milliseconds to seconds to match the database schema
        const windowStartSeconds = Math.floor(windowStart / 1000);

        const result = await this.db
            .prepare('SELECT created_at FROM rate_limits WHERE action = ? AND identifier = ? AND created_at > ?')
            .bind(action, identifier, windowStartSeconds)
            .all<{ created_at: number }>();

        return result.results || [];
    }

    // ============ ADMIN ANALYTICS OPERATIONS ============

    /**
     * Get comprehensive admin statistics
     */
    async getAdminStats(): Promise<AdminStats> {
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

        // Total users
        const totalUsersResult = await this.db
            .prepare('SELECT COUNT(*) as count FROM users')
            .first<{ count: number }>();
        const totalUsers = totalUsersResult?.count || 0;

        // New users today
        const newUsersTodayResult = await this.db
            .prepare('SELECT COUNT(*) as count FROM users WHERE created_at > ?')
            .bind(oneDayAgo)
            .first<{ count: number }>();
        const newUsersToday = newUsersTodayResult?.count || 0;

        // New users this week
        const newUsersWeekResult = await this.db
            .prepare('SELECT COUNT(*) as count FROM users WHERE created_at > ?')
            .bind(oneWeekAgo)
            .first<{ count: number }>();
        const newUsersThisWeek = newUsersWeekResult?.count || 0;

        // New users this month
        const newUsersMonthResult = await this.db
            .prepare('SELECT COUNT(*) as count FROM users WHERE created_at > ?')
            .bind(oneMonthAgo)
            .first<{ count: number }>();
        const newUsersThisMonth = newUsersMonthResult?.count || 0;

        // Active users (created at least one expense in last 7 days)
        const activeUsersResult = await this.db
            .prepare('SELECT COUNT(DISTINCT user_id) as count FROM expenses WHERE created_at > ?')
            .bind(oneWeekAgo)
            .first<{ count: number }>();
        const activeUsers7Days = activeUsersResult?.count || 0;

        // Total expenses
        const totalExpensesResult = await this.db
            .prepare('SELECT COUNT(*) as count FROM expenses')
            .first<{ count: number }>();
        const totalExpenses = totalExpensesResult?.count || 0;

        // Expenses today
        const expensesTodayResult = await this.db
            .prepare('SELECT COUNT(*) as count FROM expenses WHERE created_at > ?')
            .bind(oneDayAgo)
            .first<{ count: number }>();
        const expensesToday = expensesTodayResult?.count || 0;

        // Expenses this week
        const expensesWeekResult = await this.db
            .prepare('SELECT COUNT(*) as count FROM expenses WHERE created_at > ?')
            .bind(oneWeekAgo)
            .first<{ count: number }>();
        const expensesThisWeek = expensesWeekResult?.count || 0;

        // Expenses this month
        const expensesMonthResult = await this.db
            .prepare('SELECT COUNT(*) as count FROM expenses WHERE created_at > ?')
            .bind(oneMonthAgo)
            .first<{ count: number }>();
        const expensesThisMonth = expensesMonthResult?.count || 0;

        // Category breakdown
        const categoryResult = await this.db
            .prepare('SELECT category, COUNT(*) as count FROM expenses GROUP BY category ORDER BY count DESC')
            .all<{ category: string; count: number }>();
        const categoryBreakdown = categoryResult.results || [];

        // AI provider breakdown (from user settings)
        const providerResult = await this.db
            .prepare('SELECT COALESCE(ai_provider, \'gemini\') as provider, COUNT(*) as count FROM api_keys GROUP BY ai_provider ORDER BY count DESC')
            .all<{ provider: string; count: number }>();
        const aiProviderBreakdown = providerResult.results || [];

        // Currency breakdown (from user settings)
        const currencyResult = await this.db
            .prepare('SELECT default_currency as currency, COUNT(*) as count FROM api_keys GROUP BY default_currency ORDER BY count DESC')
            .all<{ currency: string; count: number }>();
        const currencyBreakdown = currencyResult.results || [];

        return {
            totalUsers,
            newUsersToday,
            newUsersThisWeek,
            newUsersThisMonth,
            activeUsers7Days,
            totalExpenses,
            expensesToday,
            expensesThisWeek,
            expensesThisMonth,
            categoryBreakdown,
            aiProviderBreakdown,
            currencyBreakdown,
        };
    }

    /**
     * Get all users with their stats for admin view
     */
    async getAllUsersWithStats(): Promise<UserWithStats[]> {
        // Get all users with their expense count and last expense date
        const usersResult = await this.db
            .prepare(`
                SELECT 
                    u.id,
                    u.email,
                    u.created_at,
                    COALESCE(u.email_verified, 0) as email_verified,
                    COUNT(e.id) as expenseCount,
                    MAX(e.created_at) as lastExpenseAt
                FROM users u
                LEFT JOIN expenses e ON u.id = e.user_id
                GROUP BY u.id
                ORDER BY u.created_at DESC
            `)
            .all<{
                id: string;
                email: string;
                created_at: number;
                email_verified: number;
                expenseCount: number;
                lastExpenseAt: number | null;
            }>();

        const users = usersResult.results || [];

        // Get settings for each user
        const usersWithSettings: UserWithStats[] = [];
        for (const user of users) {
            const settings = await this.getUserSettings(user.id);
            usersWithSettings.push({
                ...user,
                settings: settings ? {
                    currency: settings.default_currency,
                    aiProvider: settings.ai_provider || 'gemini',
                } : null,
            });
        }

        return usersWithSettings;
    }

    /**
     * Get expenses for a specific user by email (admin only)
     */
    async getExpensesByUserEmail(email: string): Promise<UserExpense[]> {
        // First get the user
        const user = await this.getUserByEmail(email);
        if (!user) {
            return [];
        }

        // Get all expenses for this user
        const expensesResult = await this.db
            .prepare('SELECT * FROM expenses WHERE user_id = ? ORDER BY created_at DESC LIMIT 100')
            .bind(user.id)
            .all<Expense>();

        const expenses = expensesResult.results || [];

        // Get line items for each expense
        const expensesWithLineItems: UserExpense[] = [];
        for (const expense of expenses) {
            const lineItems = await this.getLineItemsByExpenseId(expense.id);
            expensesWithLineItems.push({
                ...expense,
                lineItems,
            });
        }

        return expensesWithLineItems;
    }

    // ============ WALLET OPERATIONS ============

    async createWallet(wallet: Omit<Wallet, 'created_at' | 'updated_at'>): Promise<Wallet> {
        const now = Date.now();

        await this.db
            .prepare('INSERT INTO wallets (id, user_id, name, initial_balance, current_balance, currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .bind(wallet.id, wallet.user_id, wallet.name, wallet.initial_balance, wallet.current_balance, wallet.currency, now, now)
            .run();

        return {
            ...wallet,
            created_at: now,
            updated_at: now,
        };
    }

    async getWalletsByUserId(userId: string): Promise<Wallet[]> {
        const result = await this.db
            .prepare('SELECT * FROM wallets WHERE user_id = ? ORDER BY created_at DESC')
            .bind(userId)
            .all<Wallet>();

        return result.results || [];
    }

    async getWalletById(id: string, userId: string): Promise<Wallet | null> {
        const result = await this.db
            .prepare('SELECT * FROM wallets WHERE id = ? AND user_id = ?')
            .bind(id, userId)
            .first<Wallet>();

        return result || null;
    }

    async updateWallet(id: string, userId: string, updates: Partial<Omit<Wallet, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<void> {
        const now = Date.now();

        const fields: string[] = [];
        const values: (string | number)[] = [];

        if (updates.name !== undefined) {
            fields.push('name = ?');
            values.push(updates.name);
        }
        if (updates.initial_balance !== undefined) {
            fields.push('initial_balance = ?');
            values.push(updates.initial_balance);
        }
        if (updates.current_balance !== undefined) {
            fields.push('current_balance = ?');
            values.push(updates.current_balance);
        }
        if (updates.currency !== undefined) {
            fields.push('currency = ?');
            values.push(updates.currency);
        }

        fields.push('updated_at = ?');
        values.push(now);

        values.push(id, userId);

        await this.db
            .prepare(`UPDATE wallets SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`)
            .bind(...values)
            .run();
    }

    async updateWalletBalance(id: string, userId: string, newBalance: number): Promise<void> {
        const now = Date.now();

        await this.db
            .prepare('UPDATE wallets SET current_balance = ?, updated_at = ? WHERE id = ? AND user_id = ?')
            .bind(newBalance, now, id, userId)
            .run();
    }

    async deleteWallet(id: string, userId: string): Promise<void> {
        await this.db
            .prepare('DELETE FROM wallets WHERE id = ? AND user_id = ?')
            .bind(id, userId)
            .run();
    }
}
