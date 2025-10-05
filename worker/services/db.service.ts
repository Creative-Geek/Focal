import { Env, User, Expense, LineItem, ApiKey, Session } from '../types';

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

    // ============ API KEY OPERATIONS ============

    async saveApiKey(id: string, userId: string, encryptedKey: string, defaultCurrency: string = 'USD'): Promise<void> {
        const now = Date.now();

        // Check if user already has an API key
        const existing = await this.db
            .prepare('SELECT id FROM api_keys WHERE user_id = ?')
            .bind(userId)
            .first();

        if (existing) {
            // Update existing
            await this.db
                .prepare('UPDATE api_keys SET encrypted_key = ?, default_currency = ? WHERE user_id = ?')
                .bind(encryptedKey, defaultCurrency, userId)
                .run();
        } else {
            // Insert new
            await this.db
                .prepare('INSERT INTO api_keys (id, user_id, encrypted_key, default_currency, created_at) VALUES (?, ?, ?, ?, ?)')
                .bind(id, userId, encryptedKey, defaultCurrency, now)
                .run();
        }
    }

    async getApiKey(userId: string): Promise<ApiKey | null> {
        const result = await this.db
            .prepare('SELECT * FROM api_keys WHERE user_id = ?')
            .bind(userId)
            .first<ApiKey>();

        return result || null;
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
            .prepare('INSERT INTO expenses (id, user_id, merchant, date, total, currency, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .bind(expense.id, expense.user_id, expense.merchant, expense.date, expense.total, expense.currency, expense.category, now, now)
            .run();

        // Insert line items
        for (const item of lineItems) {
            const itemId = crypto.randomUUID();
            await this.db
                .prepare('INSERT INTO line_items (id, expense_id, description, quantity, price) VALUES (?, ?, ?, ?, ?)')
                .bind(itemId, expense.id, item.description, item.quantity, item.price)
                .run();
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

        // Build dynamic UPDATE query
        const fields: string[] = [];
        const values: (string | number)[] = [];

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

        fields.push('updated_at = ?');
        values.push(now);

        values.push(id, userId);

        await this.db
            .prepare(`UPDATE expenses SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`)
            .bind(...values)
            .run();

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
}
