import { useState, useEffect } from 'react';
import { Wallet as WalletIcon, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  getWallets,
  createWallet,
  updateWallet,
  deleteWallet,
  type Wallet,
  type WalletFormData,
} from '@/lib/wallet-service';

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [formData, setFormData] = useState<WalletFormData>({
    name: '',
    initialBalance: 0,
    currency: 'EGP',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const fetchedWallets = await getWallets();
      setWallets(fetchedWallets);
    } catch (error) {
      toast.error('Failed to load wallets');
      console.error('Failed to fetch wallets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Wallet name is required');
      return;
    }

    try {
      setSubmitting(true);
      await createWallet(formData);
      toast.success('Wallet created successfully');
      setIsCreateDialogOpen(false);
      setFormData({ name: '', initialBalance: 0, currency: 'EGP' });
      fetchWallets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create wallet');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedWallet) return;

    if (!formData.name.trim()) {
      toast.error('Wallet name is required');
      return;
    }

    try {
      setSubmitting(true);
      await updateWallet(selectedWallet.id, formData);
      toast.success('Wallet updated successfully');
      setIsEditDialogOpen(false);
      setSelectedWallet(null);
      fetchWallets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update wallet');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedWallet) return;

    try {
      setSubmitting(true);
      await deleteWallet(selectedWallet.id);
      toast.success('Wallet deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedWallet(null);
      fetchWallets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete wallet');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (wallet: Wallet) => {
    setSelectedWallet(wallet);
    setFormData({
      name: wallet.name,
      initialBalance: wallet.initial_balance,
      currency: wallet.currency,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (wallet: Wallet) => {
    setSelectedWallet(wallet);
    setIsDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <WalletIcon className="h-8 w-8" />
            Wallets
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your wallets and track their balances
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Wallet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Wallet</DialogTitle>
              <DialogDescription>
                Add a new wallet to track your funds separately
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Wallet Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Bank Account, Cash, Work Funds"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="initialBalance">Initial Balance</Label>
                <Input
                  id="initialBalance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.initialBalance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      initialBalance: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  placeholder="USD"
                  maxLength={3}
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      currency: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Wallet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {wallets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <WalletIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">No wallets yet</p>
            <p className="text-muted-foreground text-center mb-4">
              Create your first wallet to start tracking your funds separately
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Wallet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map((wallet) => (
            <Card key={wallet.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <WalletIcon className="h-5 w-5" />
                    {wallet.name}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(wallet)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(wallet)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>{wallet.currency}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-2xl font-bold">
                      {wallet.currency} {wallet.current_balance.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Initial Balance</p>
                    <p className="text-sm">
                      {wallet.currency} {wallet.initial_balance.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Spent</p>
                    <p
                      className={`text-sm font-semibold ${
                        wallet.initial_balance - wallet.current_balance > 0
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {wallet.currency}{' '}
                      {(wallet.initial_balance - wallet.current_balance).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Wallet</DialogTitle>
            <DialogDescription>
              Update wallet name, initial balance, or currency
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Wallet Name</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Bank Account, Cash, Work Funds"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-initialBalance">Initial Balance</Label>
              <Input
                id="edit-initialBalance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.initialBalance}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    initialBalance: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-currency">Currency</Label>
              <Input
                id="edit-currency"
                placeholder="USD"
                maxLength={3}
                value={formData.currency}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    currency: e.target.value.toUpperCase(),
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the wallet "{selectedWallet?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
