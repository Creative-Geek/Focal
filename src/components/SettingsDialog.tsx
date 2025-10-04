import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Loader } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "EGP", "SAR"];
const API_BASE_URL = "/api";

// Helper to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("auth_token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void; // Callback after successful save
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onOpenChange,
  onSave,
}) => {
  const [apiKey, setApiKey] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // Fetch API key status and currency
      const [keyResponse, currencyResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/settings/api-key`, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/settings/currency`, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
      ]);

      if (keyResponse.ok) {
        const keyData = await keyResponse.json();
        setHasExistingKey(keyData.data?.hasApiKey || false);
        // Don't set the actual key value for security
        setApiKey("");
      }

      if (currencyResponse.ok) {
        const currencyData = await currencyResponse.json();
        setCurrency(currencyData.data?.defaultCurrency || "USD");
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const requests: Promise<Response>[] = [];

      // Save API key if provided
      if (apiKey.trim()) {
        requests.push(
          fetch(`${API_BASE_URL}/settings/api-key`, {
            method: "PUT",
            headers: getAuthHeaders(),
            credentials: "include",
            body: JSON.stringify({
              apiKey: apiKey.trim(),
              defaultCurrency: currency,
            }),
          })
        );
      } else if (hasExistingKey) {
        // Update currency only if key exists and no new key provided
        requests.push(
          fetch(`${API_BASE_URL}/settings/currency`, {
            method: "PUT",
            headers: getAuthHeaders(),
            credentials: "include",
            body: JSON.stringify({ defaultCurrency: currency }),
          })
        );
      }

      if (requests.length > 0) {
        const responses = await Promise.all(requests);
        const allSuccess = responses.every((r) => r.ok);

        if (allSuccess) {
          toast.success("Settings Saved", {
            description: "Your settings have been updated successfully.",
          });
          setApiKey(""); // Clear the input
          setHasExistingKey(true);
          onOpenChange(false);

          // Trigger refresh callback if provided
          if (onSave) {
            onSave();
          }
        } else {
          throw new Error("Failed to save settings");
        }
      } else {
        toast.error("Please enter an API key");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your application settings. Your API key is encrypted and
            stored securely on the server.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="api-key" className="text-right col-span-1">
                  API Key
                </Label>
                <div className="col-span-3 space-y-2">
                  <Input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      hasExistingKey
                        ? "••••••••••••••••"
                        : "Enter your Gemini API key"
                    }
                  />
                  {hasExistingKey && (
                    <p className="text-xs text-muted-foreground">
                      API key is configured. Enter a new key to update.
                    </p>
                  )}
                </div>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
