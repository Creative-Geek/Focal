import type { Expense } from '../../worker/types';
export type ExpenseData = Omit<Expense, 'id'>;
const EXPENSES_STORAGE_KEY = 'focal-expenses';
const API_KEY_STORAGE_KEY = 'focal-api-key';
const DEFAULT_CURRENCY_STORAGE_KEY = 'focal-default-currency';
class ExpenseService {
  private baseUrl = '/api';
  async processReceipt(base64Image: string): Promise<{ success: boolean; data?: ExpenseData; error?: string }> {
    try {
      const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
      const body: { image: string; apiKey?: string } = { image: base64Image };
      if (apiKey) {
        body.apiKey = apiKey;
      }
      const response = await fetch(`${this.baseUrl}/process-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to process receipt:', error);
      return { success: false, error: 'Failed to connect to the server.' };
    }
  }
  async saveExpense(expenseData: ExpenseData): Promise<{ success: boolean; data?: Expense; error?: string }> {
    try {
      const expenses = await this.getExpensesFromStorage();
      const newExpense: Expense = { ...expenseData, id: crypto.randomUUID() };
      expenses.push(newExpense);
      localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
      return { success: true, data: newExpense };
    } catch (error) {
      console.error('Failed to save expense:', error);
      return { success: false, error: 'Failed to save expense to local storage.' };
    }
  }
  async getExpenses(): Promise<{ success: boolean; data?: Expense[]; error?: string }> {
    try {
      const expenses = await this.getExpensesFromStorage();
      return { success: true, data: expenses };
    } catch (error) {
      console.error('Failed to get expenses:', error);
      return { success: false, error: 'Failed to retrieve expenses from local storage.' };
    }
  }
  async deleteExpense(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      let expenses = await this.getExpensesFromStorage();
      expenses = expenses.filter(expense => expense.id !== id);
      localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
      return { success: true };
    } catch (error) {
      console.error('Failed to delete expense:', error);
      return { success: false, error: 'Failed to delete expense from local storage.' };
    }
  }
  async updateExpense(id: string, updatedData: ExpenseData): Promise<{ success: boolean; data?: Expense; error?: string }> {
    try {
      const expenses = await this.getExpensesFromStorage();
      const expenseIndex = expenses.findIndex(exp => exp.id === id);
      if (expenseIndex === -1) {
        return { success: false, error: 'Expense not found.' };
      }
      const updatedExpense = { ...updatedData, id };
      expenses[expenseIndex] = updatedExpense;
      localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
      return { success: true, data: updatedExpense };
    } catch (error) {
      console.error('Failed to update expense:', error);
      return { success: false, error: 'Failed to update expense in local storage.' };
    }
  }
  private async getExpensesFromStorage(): Promise<Expense[]> {
    const storedExpenses = localStorage.getItem(EXPENSES_STORAGE_KEY);
    if (storedExpenses) {
      try {
        const parsed = JSON.parse(storedExpenses);
        // Sort by date descending
        return Array.isArray(parsed) ? parsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];
      } catch (e) {
        console.error("Failed to parse expenses from localStorage", e);
        return [];
      }
    }
    return [];
  }
  getDefaultCurrency(): string {
    return localStorage.getItem(DEFAULT_CURRENCY_STORAGE_KEY) || 'USD';
  }
}
export const expenseService = new ExpenseService();