import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Loader, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

const CURRENCIES = ["CAD", "EGP", "EUR", "GBP", "JPY", "SAR", "USD"];
const AI_PROVIDERS = [
  { value: "gemini", label: "Google Gemini" },
  { value: "openai", label: "OpenAI GPT-4o" },
  { value: "nvidia", label: "Nvidia NIM (Experimental)" },
];
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

export const SettingsPage: React.FC = () => {
  const [currency, setCurrency] = useState("USD");
  const [aiProvider, setAiProvider] = useState("gemini");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const [currencyResponse, providerResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/settings/currency`, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/settings/ai-provider`, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
      ]);

      if (currencyResponse.ok) {
        const currencyData = await currencyResponse.json();
        setCurrency(currencyData.data?.defaultCurrency || "USD");
      }

      if (providerResponse.ok) {
        const providerData = await providerResponse.json();
        setAiProvider(providerData.data?.aiProvider || "gemini");
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
      const [currencyResponse, providerResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/settings/currency`, {
          method: "PUT",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({ defaultCurrency: currency }),
        }),
        fetch(`${API_BASE_URL}/settings/ai-provider`, {
          method: "PUT",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({ aiProvider }),
        }),
      ]);

      if (currencyResponse.ok && providerResponse.ok) {
        toast.success("Settings Saved", {
          description: "Your preferences have been updated successfully.",
        });
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Manage your application preferences.
        </p>
      </header>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Choose your preferred AI provider for receipt scanning. You have
              10 free scans per day.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6">
            <div className="grid md:grid-cols-3 items-start gap-4">
              <Label htmlFor="ai-provider" className="md:text-right md:mt-2">
                AI Provider
              </Label>
              <div className="md:col-span-2 space-y-2">
                <Select value={aiProvider} onValueChange={setAiProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select AI provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_PROVIDERS.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        <div className="flex flex-col">
                          <span>{provider.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Switch providers if one isn't working or to try different
                  accuracy levels.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 items-center gap-4">
              <Label htmlFor="currency" className="md:text-right">
                Default Currency
              </Label>
              <div className="md:col-span-2">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
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
                <p className="text-xs text-muted-foreground mt-2">
                  This currency will be automatically assigned to new expenses.
                </p>
              </div>
            </div>
          </div>
          <footer className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </footer>
        </div>
      )}
    </div>
  );
};
