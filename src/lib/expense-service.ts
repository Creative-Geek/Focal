import type { Expense, ExpenseData } from '../types';

// Re-export ExpenseData for components
export type { ExpenseData } from '../types';

const API_BASE_URL = '/api';

export interface LineItem {
  description: string;
  quantity: number;
  price: number;
}

// Helper to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

class ExpenseService {
  /**
   * Process a receipt image using the backend API
   */
  async processReceipt(base64Image: string): Promise<{ success: boolean; data?: ExpenseData; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/receipts/process`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ image: base64Image }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to process receipt',
        };
      }

      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('Error processing receipt:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred while processing the receipt.',
      };
    }
  }

  /**
   * Save a new expense
   */
  async saveExpense(expenseData: ExpenseData): Promise<{ success: boolean; data?: Expense; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(expenseData),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to save expense',
        };
      }

      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('Failed to save expense:', error);
      return { success: false, error: error.message || 'Failed to save expense.' };
    }
  }

  /**
   * Get all expenses for the current user
   */
  async getExpenses(): Promise<{ success: boolean; data?: Expense[]; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to retrieve expenses',
        };
      }

      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('Failed to get expenses:', error);
      return { success: false, error: error.message || 'Failed to retrieve expenses.' };
    }
  }

  /**
   * Delete an expense
   */
  async deleteExpense(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to delete expense',
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Failed to delete expense:', error);
      return { success: false, error: error.message || 'Failed to delete expense.' };
    }
  }

  /**
   * Update an existing expense
   */
  async updateExpense(id: string, updatedData: ExpenseData): Promise<{ success: boolean; data?: Expense; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(updatedData),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to update expense',
        };
      }

      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('Failed to update expense:', error);
      return { success: false, error: error.message || 'Failed to update expense.' };
    }
  }

}

export const expenseService = new ExpenseService();