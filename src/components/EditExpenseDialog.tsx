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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { toast } from "sonner";
import { Save, Loader } from "lucide-react";
import { expenseService, ExpenseData } from "@/lib/expense-service";
import type { Expense } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { ExpenseForm } from "./ExpenseForm";
interface EditExpenseDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedExpense: Expense) => void;
}
export const EditExpenseDialog: React.FC<EditExpenseDialogProps> = ({
  expense,
  open,
  onOpenChange,
  onSave,
}) => {
  const [editedData, setEditedData] = useState<ExpenseData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isMobile = useIsMobile();
  useEffect(() => {
    if (expense) {
      setEditedData(JSON.parse(JSON.stringify(expense)));
    }
  }, [expense]);
  const handleSave = async () => {
    if (editedData && expense) {
      setIsSaving(true);
      try {
        const response = await expenseService.updateExpense(
          expense.id,
          editedData
        );
        if (response.success && response.data) {
          toast.success("Expense Updated!", {
            description: `Changes to ${response.data.merchant} have been saved.`,
          });
          onSave(response.data);
          onOpenChange(false);
        } else {
          toast.error("Update Failed", { description: response.error });
        }
      } catch (e) {
        toast.error("Update Error", {
          description: "Could not connect to the server.",
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Edit Expense</DrawerTitle>
            <DrawerDescription>
              Make changes to your expense record below. Click save when you're
              done.
            </DrawerDescription>
          </DrawerHeader>
          {editedData && (
            <div className="px-4 overflow-y-auto">
              <ExpenseForm value={editedData} onChange={setEditedData} />
            </div>
          )}
          <DrawerFooter className="pt-2 gap-2">
            <DrawerClose asChild>
              <Button variant="outline" disabled={isSaving}>
                Cancel
              </Button>
            </DrawerClose>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
          <DialogDescription>
            Make changes to your expense record below. Click save when you're
            done.
          </DialogDescription>
        </DialogHeader>
        {editedData && (
          <div className="px-4">
            <ExpenseForm value={editedData} onChange={setEditedData} />
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
