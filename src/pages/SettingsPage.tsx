import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { useModel } from "@/hooks/use-model";

const CURRENCIES = ["CAD", "EGP", "EUR", "GBP", "JPY", "SAR", "USD"];
const MODELS = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
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
  const [apiKey, setApiKey] = useState("");
  const [currency, setCurrency] = useState("USD");
  const { model, setModel } = useModel();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

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
    <div className="container max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Manage your application settings. Your API key is encrypted and
          stored securely on the server.
        </p>
      </header>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-6">
            <div className="grid md:grid-cols-3 items-start gap-4">
              <Label htmlFor="api-key" className="md:text-right md:mt-2">
                API Key
              </Label>
              <div className="md:col-span-2 space-y-2">
                <Input
                  id="api-key"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  autoCapitalize="none"
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
            <div className="grid md:grid-cols-3 items-center gap-4">
              <Label htmlFor="currency" className="md:text-right">
                Currency
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
              </div>
            </div>
            <div className="grid md:grid-cols-3 items-center gap-4">
              <Label htmlFor="model" className="md:text-right">
                Model
              </Label>
              <div className="md:col-span-2">
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
