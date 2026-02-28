import { API_BASE_URL } from './api';

export interface Wallet {
    id: string;
    user_id: string;
    name: string;
    initial_balance: number;
    current_balance: number;
    currency: string;
    created_at: number;
    updated_at: number;
}

export interface WalletFormData {
    name: string;
    initialBalance: number;
    currency: string;
}

const API_URL = `${API_BASE_URL}/api/wallets`;

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
    return localStorage.getItem('token');
}

/**
 * Get all wallets for the current user
 */
export async function getWallets(): Promise<Wallet[]> {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token found');
    }

    const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch wallets');
    }

    const result = await response.json();
    return result.data;
}

/**
 * Get a single wallet by ID
 */
export async function getWalletById(id: string): Promise<Wallet> {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_URL}/${id}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch wallet');
    }

    const result = await response.json();
    return result.data;
}

/**
 * Create a new wallet
 */
export async function createWallet(data: WalletFormData): Promise<Wallet> {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token found');
    }

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create wallet');
    }

    const result = await response.json();
    return result.data;
}

/**
 * Update an existing wallet
 */
export async function updateWallet(id: string, data: Partial<WalletFormData>): Promise<Wallet> {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update wallet');
    }

    const result = await response.json();
    return result.data;
}

/**
 * Delete a wallet
 */
export async function deleteWallet(id: string): Promise<void> {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete wallet');
    }
}
