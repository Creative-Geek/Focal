import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Expense, ExpenseData } from '../types';

// Re-export ExpenseData for components
export type { ExpenseData } from '../types';

const EXPENSES_STORAGE_KEY = 'focal-expenses';
const API_KEY_STORAGE_KEY = 'focal-api-key';
const DEFAULT_CURRENCY_STORAGE_KEY = 'focal-default-currency';

export interface LineItem {
  description: string;
  quantity: number;
  price: number;
}

class ExpenseService {
  async processReceipt(base64Image: string): Promise<{ success: boolean; data?: ExpenseData; error?: string }> {
    try {
      const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);

      if (!apiKey || apiKey === 'your-cloudflare-api-key') {
        return {
          success: false,
          error: 'AI API key is missing. Please configure your Google AI API key in the application settings to proceed.'
        };
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        systemInstruction: `You are an expert receipt processing AI. Extract the following information from the user's receipt image and return it as a valid JSON object. The JSON schema should be: { "merchant": string, "date": "YYYY-MM-DD", "total": number, "currency": string (use ISO 4217 codes like "USD", "EUR", "GBP", "JPY", "CAD", "EGP", "SAR" - never use "Unknown"), "category": "Food & Drink" | "Groceries" | "Travel" | "Shopping" | "Utilities" | "Other", "lineItems": [{ "description": string, "quantity": number, "price": number }] }. IMPORTANT: The currency field must be a valid 3-letter ISO 4217 currency code. If you cannot determine the currency from the receipt, use "USD" as the default. Never use "Unknown" or any invalid currency code. If a value is not clear, make a reasonable guess or use a placeholder. Ensure the total is a number. Respond ONLY with the JSON object.`,
        generationConfig: { responseMimeType: "application/json" },
      });

      const match = base64Image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.*)$/);
      if (!match) {
        return { success: false, error: 'Invalid image format. Only JPEG, PNG, and WEBP are supported.' };
      }

      const [, mimeType, base64Data] = match;
      const imagePart = { inlineData: { mimeType, data: base64Data } };
      const result = await model.generateContent(["Extract the receipt data as JSON.", imagePart]);
      const response = result.response;
      const text = response.text();
      const parsedData = JSON.parse(text);

      return { success: true, data: parsedData };
    } catch (error: any) {
      console.error('Error processing receipt:', error);
      let errorMessage = 'An unexpected error occurred while processing the receipt.';

      if (error.message?.includes('API key not valid')) {
        errorMessage = 'The provided Google AI API key is invalid. Please check your key in the settings.';
      } else if (error.message) {
        errorMessage = `The AI service returned an error: ${error.message}`;
      }

      return { success: false, error: errorMessage };
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
        if (Array.isArray(parsed)) {
          // Clean up any expenses with invalid currency codes
          const cleanedExpenses = parsed.map(expense => ({
            ...expense,
            currency: this.validateCurrency(expense.currency)
          }));
          // If any currencies were fixed, save the cleaned data back
          const hasInvalidCurrency = parsed.some(exp => exp.currency !== this.validateCurrency(exp.currency));
          if (hasInvalidCurrency) {
            localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(cleanedExpenses));
            console.log('Fixed invalid currency codes in stored expenses');
          }
          return cleanedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        return [];
      } catch (e) {
        console.error("Failed to parse expenses from localStorage", e);
        return [];
      }
    }
    return [];
  }

  private validateCurrency(currency: string): string {
    // List of valid ISO 4217 currency codes that the app supports
    const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'EGP', 'SAR'];

    if (!currency || currency === 'Unknown' || currency.length !== 3) {
      return 'USD';
    }

    const upperCurrency = currency.toUpperCase();
    return validCurrencies.includes(upperCurrency) ? upperCurrency : 'USD';
  }

  getDefaultCurrency(): string {
    return localStorage.getItem(DEFAULT_CURRENCY_STORAGE_KEY) || 'USD';
  }
}

export const expenseService = new ExpenseService();