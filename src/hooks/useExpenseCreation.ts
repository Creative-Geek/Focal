import { useState, useEffect } from 'react';
import { expenseService, ExpenseData } from '@/lib/expense-service';
import { resizeImage } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const useExpenseCreation = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [extractedData, setExtractedData] = useState<ExpenseData | null>(null);
    const [originalData, setOriginalData] = useState<ExpenseData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [defaultCurrency, setDefaultCurrency] = useState('USD');

    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserCurrency = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                const response = await fetch('/api/settings/currency', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.data?.defaultCurrency) {
                        setDefaultCurrency(data.data.defaultCurrency);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch default currency:', error);
            }
        };
        fetchUserCurrency();
    }, []);

    const handleImageProcessing = async (base64Image: string) => {
        setIsProcessing(true);
        setError(null);
        setExtractedData(null);
        setOriginalData(null);

        try {
            const resizedImage = await resizeImage(base64Image, 1200);
            const response = await expenseService.processReceipt(resizedImage);

            if (response.success && response.data) {
                const data = {
                    ...response.data,
                    lineItems: response.data.lineItems || [],
                };
                setExtractedData(data);
                setOriginalData(data);
            } else {
                setError(response.error || 'Failed to extract data from receipt.');
                toast.error('Processing Failed', { description: response.error });
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
            setError(errorMessage);
            toast.error('Processing Error', { description: 'Could not connect to the server.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAudioProcessing = async (audioBlob: Blob) => {
        setIsProcessing(true);
        setError(null);
        setExtractedData(null);
        setOriginalData(null);

        try {
            const response = await expenseService.processAudioReceipt(audioBlob);
            if (response.success && response.data && response.data.length > 0) {
                // For now, we handle the first receipt if multiple are returned, 
                // or we could switch to the multi-receipt dialog.
                // But the ReviewExpenseDialog is designed for single expense.
                // If we want to support multiple receipts here, we might need a different flow.
                // However, the user asked for "Voice Note" which usually implies one receipt or a list.
                // The current PoC returns a list.
                // If we use the single-expense ReviewDialog, we might need to pick the first one or change the UI.

                // Ideally, we should use ReceiptReviewDialog for multiple receipts.
                // But for consistency with the "Add Expense" flow which is usually single, 
                // let's see.

                // If the hook is used for "Add Expense", maybe we should support multiple?
                // But ReviewExpenseDialog is single.

                // Let's return the list and let the component decide?
                // Or just take the first one for now if we are using the single review dialog.
                // But wait, the previous implementation used ReceiptReviewDialog for audio.

                // Let's handle this by returning the data and letting the caller decide?
                // Or we can update the state to hold an array?

                // For this refactor, let's stick to the single expense flow for image/manual,
                // and for audio, we might need to handle it differently if it returns multiple.

                // Actually, if we want to unify, we should probably support multiple everywhere,
                // but image processing currently returns one.

                // Let's assume for now we take the first one if it's a single expense flow,
                // OR we can expose a separate state for multiple receipts.

                // Let's just expose the raw response or handle it.

                // If we want to use ReceiptReviewDialog for audio, we need to expose that state.

                // Let's add `extractedReceipts` state for multiple.

                // But wait, the user wants "Record Voice" in the menu.
                // If I record voice, I get multiple receipts.
                // So I should probably use ReceiptReviewDialog for audio results.

                // So this hook should manage both?

                return response.data; // Return data so caller can handle it (e.g. open specific dialog)
            } else {
                setError(response.error || 'Failed to process audio.');
                toast.error('Processing Failed', { description: response.error });
                return null;
            }
        } catch (e) {
            console.error('Error processing audio:', e);
            toast.error('Processing Error', { description: 'Could not connect to the server.' });
            return null;
        } finally {
            setIsProcessing(false);
        }
    };

    const handleManualEntry = () => {
        const today = new Date().toISOString().split('T')[0];
        const newData = {
            merchant: '',
            date: today,
            total: 0,
            currency: defaultCurrency,
            category: 'Other',
            lineItems: [{ description: '', quantity: 1, price: 0 }],
        };
        setExtractedData(newData);
        setOriginalData(newData);
    };

    const handleSave = async () => {
        if (extractedData && !isSaving) {
            setIsSaving(true);
            try {
                const response = await expenseService.saveExpense(extractedData);
                if (response.success) {
                    toast.success('Expense Saved!', {
                        description: `${extractedData.merchant} for ${extractedData.total} has been added.`,
                    });
                    setExtractedData(null);
                    // Optional: Trigger a refresh callback if provided
                    return true;
                } else {
                    toast.error('Save Failed', { description: response.error });
                    return false;
                }
            } catch (e) {
                toast.error('Save Error', { description: 'Could not connect to the server.' });
                return false;
            } finally {
                setIsSaving(false);
            }
        }
        return false;
    };

    return {
        isProcessing,
        isSaving,
        extractedData,
        setExtractedData,
        originalData,
        error,
        setError,
        handleImageProcessing,
        handleAudioProcessing,
        handleManualEntry,
        handleSave,
    };
};
