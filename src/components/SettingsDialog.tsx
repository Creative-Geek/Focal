import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, Loader } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'EGP', 'SAR'];
interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange }) => {
  const [apiKey, setApiKey] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    if (open) {
      const storedKey = localStorage.getItem('focal-api-key') || '';
      setApiKey(storedKey);
      const storedCurrency = localStorage.getItem('focal-default-currency') || 'USD';
      setCurrency(storedCurrency);
    }
  }, [open]);
  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem('focal-api-key', apiKey);
    localStorage.setItem('focal-default-currency', currency);
    setTimeout(() => {
      toast.success('Settings Saved', {
        description: 'Your Google AI API key and default currency have been saved.',
      });
      setIsSaving(false);
      onOpenChange(false);
    }, 500); // Simulate save
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your application settings here. Your Google AI API key is stored securely in your browser's local storage.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="api-key" className="text-right col-span-1">
              API Key
            </Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="col-span-3"
              placeholder="Enter your Google AI API key"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="currency" className="text-right col-span-1">
              Currency
            </Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};