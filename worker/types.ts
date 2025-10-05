// Backend Type Definitions for Focal Finance Tracker

export interface Env {
    DB: D1Database;
    ASSETS?: Fetcher; // Optional in development (Vite serves frontend)
    JWT_SECRET: string;
    ENCRYPTION_KEY: string;
    NODE_ENV: string;
    BREVO_API_KEY?: string; // Optional: Brevo API key for sending transactional emails
    APP_URL?: string; // Optional: Application URL for email links (defaults to localhost in dev)
}

export interface User {
    id: string;
    email: string;
    password_hash: string;
    email_verified?: number; // 0 or 1 (SQLite boolean)
    verification_token?: string | null;
    verification_token_expires?: number | null;
    created_at: number;
    updated_at: number;
}

export interface ApiKey {
    id: string;
    user_id: string;
    encrypted_key: string;
    default_currency: string;
    created_at: number;
}

export interface Expense {
    id: string;
    user_id: string;
    merchant: string;
    date: string;
    total: number;
    currency: string;
    category: string;
    created_at: number;
    updated_at: number;
}

export interface LineItem {
    id: string;
    expense_id: string;
    description: string;
    quantity: number;
    price: number;
}

export interface Session {
    id: string;
    user_id: string;
    token: string;
    expires_at: number;
    created_at: number;
}

export interface JWTPayload {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
}

export interface APIResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
