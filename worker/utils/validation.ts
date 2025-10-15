import { z } from 'zod';

/**
 * Validation schemas for API requests
 */

export const signupSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const expenseSchema = z.object({
    merchant: z.string().min(1, 'Merchant is required'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    total: z.number().min(0, 'Total must be a non-negative number'),
    currency: z.string().length(3, 'Currency must be a 3-letter ISO code'),
    category: z.enum(['Food & Drink', 'Groceries', 'Travel', 'Shopping', 'Utilities', 'Other']),
    lineItems: z.array(
        z.object({
            description: z.string().min(1, 'Description is required'),
            quantity: z.number().positive('Quantity must be a positive number'),
            price: z.number().min(0, 'Price must be non-negative'),
        })
    ),
});

export const processReceiptSchema = z.object({
    image: z.string().min(1, 'Image data is required'),
});

/**
 * Validate request body against a schema
 */
export async function validateRequest<T>(
    request: Request,
    schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
    try {
        const body = await request.json();
        const result = schema.safeParse(body);

        if (!result.success) {
            const errors = result.error.issues.map((err) => err.message).join(', ');
            return { success: false, error: errors };
        }

        return { success: true, data: result.data };
    } catch (err) {
        return { success: false, error: 'Invalid JSON body' };
    }
}
