import React, { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  X,
  Loader,
  Save,
  Lightbulb,
  Upload,
  PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Toaster, toast } from "sonner";
import { expenseService, ExpenseData } from "@/lib/expense-service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { ExpenseForm } from "@/components/ExpenseForm";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { resizeImage } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: "environment",
};

// Hoisted to keep identity stable and avoid remount/focus loss
function ReviewForm(props: {
  isMobile: boolean;
  isProcessing: boolean;
  isSaving: boolean;
  extractedData: ExpenseData | null;
  setExtractedData: (data: ExpenseData | null) => void;
  handleSave: () => void;
  originalData: ExpenseData | null;
}) {
  const {
    isMobile,
    isProcessing,
    isSaving,
    extractedData,
    setExtractedData,
    handleSave,
    originalData,
  } = props;
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (originalData && extractedData) {
      setIsDirty(
        JSON.stringify(originalData) !== JSON.stringify(extractedData)
      );
    } else {
      setIsDirty(false);
    }
  }, [extractedData, originalData]);

  const handleCloseAttempt = () => {
    if (isDirty && !isSaving) {
      setIsConfirmationOpen(true);
    } else {
      setExtractedData(null);
    }
  };

  const handleConfirmClose = () => {
    setExtractedData(null);
    setIsConfirmationOpen(false);
    setIsDirty(false);
  };

  const Wrapper = isMobile ? Drawer : Dialog;
  const Content = isMobile ? DrawerContent : DialogContent;
  const Header = isMobile ? DrawerHeader : DialogHeader;
  const Title = isMobile ? DrawerTitle : DialogTitle;
  const Description = isMobile ? DrawerDescription : DialogDescription;
  const Footer = isMobile ? DrawerFooter : DialogFooter;

  return (
    <>
      <Wrapper
        open={isProcessing || !!extractedData}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseAttempt();
          }
        }}
      >
        <Content
          className={isMobile ? "max-h-[85vh]" : "max-w-2xl"}
          onPointerDownOutside={(e) => {
            if (isSaving) e.preventDefault();
            if (isDirty) {
              e.preventDefault();
              handleCloseAttempt();
            }
          }}
          onInteractOutside={(e) => {
            if (isSaving) e.preventDefault();
          }}
          // The escape key is handled by onOpenChange
        >
          <Header className={isMobile ? "pb-2" : ""}>
            <Title className="text-lg sm:text-xl">
              {isProcessing ? "Analyzing Receipt..." : "Review Expense"}
            </Title>
            <Description className="text-sm">
              {isProcessing
                ? "Please wait while we extract the details from your receipt."
                : "Review and edit the extracted details before saving."}
            </Description>
          </Header>
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center h-48 sm:h-64 space-y-4 px-4">
              <Loader className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-focal-blue-500" />
              <p className="text-sm sm:text-base text-muted-foreground">
                Our AI is hard at work...
              </p>
            </div>
          ) : (
            extractedData && (
              <div className="px-3 sm:px-4 overflow-y-auto">
                <ExpenseForm
                  value={extractedData}
                  onChange={setExtractedData}
                />
              </div>
            )
          )}
          <Footer className={isMobile ? "pt-2 gap-2" : ""}>
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={handleCloseAttempt}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isProcessing || isSaving || !isDirty}
            >
              {isSaving ? (
                <Loader className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Expense
            </Button>
          </Footer>
        </Content>
      </Wrapper>
      <AlertDialog
        open={isConfirmationOpen}
        onOpenChange={setIsConfirmationOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discard your changes? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClose}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export const HomePage: React.FC = () => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedData, setExtractedData] = useState<ExpenseData | null>(null);
  const [originalData, setOriginalData] = useState<ExpenseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const fetchUserCurrency = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/settings/currency", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.data?.defaultCurrency) {
          setDefaultCurrency(data.data.defaultCurrency);
        }
      }
    } catch (error) {
      console.error("Failed to fetch default currency:", error);
    }
  };

  useEffect(() => {
    fetchUserCurrency();
  }, []);

  const handleImageProcessing = async (base64Image: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      // Resize image to max 1200x1200 before sending to API
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
        setError(response.error || "Failed to extract data from receipt.");
        toast.error("Processing Failed", { description: response.error });
      }
    } catch (e) {
      setError("An unexpected error occurred during processing.");
      toast.error("Processing Error", {
        description: "Could not connect to the server.",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  const capture = useCallback(async () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setIsCameraOpen(false);
        handleImageProcessing(imageSrc);
      }
    }
  }, [webcamRef]);
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Image = e.target?.result as string;
        if (base64Image) {
          handleImageProcessing(base64Image);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleManualEntry = () => {
    const today = new Date().toISOString().split("T")[0];
    const newData = {
      merchant: "",
      date: today,
      total: 0,
      currency: defaultCurrency,
      category: "Other",
      lineItems: [{ description: "", quantity: 1, price: 0 }],
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
          toast.success("Expense Saved!", {
            description: `${extractedData.merchant} for ${extractedData.total} has been added.`,
          });
          // Clear state first, then navigate
          setExtractedData(null);
          setIsSaving(false);
          // Navigate after state is cleared
          navigate("/expenses");
        } else {
          toast.error("Save Failed", { description: response.error });
          setIsSaving(false);
        }
      } catch (e) {
        toast.error("Save Error", {
          description: "Could not connect to the server.",
        });
        setIsSaving(false);
      }
    }
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="relative flex-grow flex flex-col items-center justify-center bg-background text-foreground px-3 sm:px-4 py-8 overflow-hidden w-full">
        <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem] dark:bg-neutral-950 dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)]"></div>
        <div className="absolute inset-0 bg-hero-gradient -z-10" />

        {/* Email Verification Banner */}
        {user && user.emailVerified === false && (
          <div className="w-full max-w-4xl mb-6 z-20">
            <EmailVerificationBanner />
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center space-y-4 sm:space-y-6 z-10 w-full max-w-4xl"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl xl:text-7xl font-display font-bold text-balance leading-tight px-2">
            Scan, Review, Done.
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty px-2 sm:px-4">
            Instantly capture, analyze, and organize your expenses with a single
            photo. The fastest way to track your spending.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 w-full max-w-2xl mx-auto px-2 sm:px-4">
            <Button
              size="lg"
              onClick={() => setIsCameraOpen(true)}
              className="bg-focal-blue-500 hover:bg-focal-blue-600 text-white px-6 sm:px-10 py-4 sm:py-6 text-base sm:text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 w-full sm:w-auto"
            >
              <Camera className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
              Scan Receipt
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="px-6 sm:px-10 py-4 sm:py-6 text-base sm:text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 w-full sm:w-auto"
            >
              <Upload className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
              Upload Photo
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleManualEntry}
              className="px-6 sm:px-10 py-4 sm:py-6 text-base sm:text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 w-full sm:w-auto"
            >
              <PenLine className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
              Manual Entry
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
        </motion.div>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 sm:mt-8 max-w-md w-full px-4"
          >
            <Alert variant="destructive">
              <AlertTitle>Processing Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </div>
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4"
          >
            <div className="relative w-full max-w-4xl">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                className="rounded-lg shadow-2xl w-full"
              />
              <div className="absolute bottom-4 left-4 right-4 bg-black/50 text-white p-3 rounded-lg text-sm flex items-center gap-3">
                <Lightbulb className="h-5 w-5 text-yellow-300 flex-shrink-0" />
                <span>
                  For best results: ensure good lighting and place the receipt
                  on a flat, contrasting surface.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-6">
              <Button
                onClick={capture}
                className="w-20 h-20 rounded-full bg-white hover:bg-gray-200 ring-4 ring-white ring-offset-4 ring-offset-black/50"
              >
                <Camera className="h-10 w-10 text-black" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCameraOpen(false)}
                className="absolute top-6 right-6 text-white hover:bg-white/20 w-12 h-12 rounded-full"
              >
                <X className="h-8 w-8" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ReviewForm
        isMobile={isMobile}
        isProcessing={isProcessing}
        isSaving={isSaving}
        extractedData={extractedData}
        setExtractedData={setExtractedData}
        handleSave={handleSave}
        originalData={originalData}
      />
    </>
  );
};
