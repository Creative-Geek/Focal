# Wallet Feature Implementation

## Overview

The wallet feature allows users to create and manage multiple wallets (e.g., bank accounts, cash on hand, work funds) and track their balances separately. When users create expenses, they can optionally associate them with a specific wallet, which automatically deducts the expense amount from that wallet's balance.

## Key Features

- **Multiple Wallets**: Users can create unlimited wallets with custom names
- **Balance Tracking**: Each wallet maintains an initial balance and current balance
- **Automatic Updates**: Wallet balances update automatically when expenses are created, edited, or deleted
- **Optional Integration**: Wallets are optional - expenses can be created without selecting a wallet
- **Backward Compatible**: Existing expenses without wallet associations continue to work

## Database Schema

### Wallets Table
```sql
CREATE TABLE wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  initial_balance REAL NOT NULL DEFAULT 0,
  current_balance REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Expenses Table Updates
```sql
ALTER TABLE expenses ADD COLUMN wallet_id TEXT;
```

## API Endpoints

All wallet endpoints require authentication.

### Get All Wallets
```
GET /api/wallets
Response: { success: true, data: Wallet[] }
```

### Get Single Wallet
```
GET /api/wallets/:id
Response: { success: true, data: Wallet }
```

### Create Wallet
```
POST /api/wallets
Body: {
  name: string,
  initialBalance: number,
  currency: string
}
Response: { success: true, data: Wallet }
```

### Update Wallet
```
PUT /api/wallets/:id
Body: {
  name?: string,
  initialBalance?: number,
  currency?: string
}
Response: { success: true, data: Wallet }
```

Note: Updating `initialBalance` adjusts the `current_balance` by the difference to maintain the correct spent amount.

### Delete Wallet
```
DELETE /api/wallets/:id
Response: { success: true, message: string }
```

## Wallet Balance Management

### Creation
When an expense is created with a `wallet_id`:
1. The expense is inserted into the database
2. The wallet's current_balance is decreased by the expense total
3. All operations are done in the `DBService.createExpense` method

### Update
When an expense is updated:
1. If the wallet changed, the old wallet's balance is restored and the new wallet's balance is decreased
2. If only the total changed, the balance is recalculated for the associated wallet
3. All operations are done in the `DBService.updateExpense` method

### Deletion
When an expense is deleted:
1. If the expense had a wallet, the balance is restored to that wallet
2. The expense is then deleted (line items cascade)
3. All operations are done in the `DBService.deleteExpense` method

## Frontend Components

### Wallets Page (`/wallets`)
- Displays all user wallets in a card grid
- Shows current balance, initial balance, and spent amount
- Provides create, edit, and delete actions
- Empty state with call-to-action for first wallet

### Wallet Form
- Create new wallet with name, initial balance, and currency
- Edit existing wallet (updates adjust current balance)
- Form validation ensures required fields

### Expense Form Integration
- Wallet selector dropdown (optional)
- Shows wallet name, currency, and current balance
- Loads wallets asynchronously on form mount
- Positioned after currency field

## Navigation

### Desktop
- Added "Wallets" link to header navigation
- Positioned between "Expenses" and settings

### Mobile
- Added to bottom navigation bar
- Uses wallet icon
- 4-item navigation (Scan, Expenses, Wallets, Settings)

## Migration

To apply the wallet migration:

```bash
# Local development
npm run db:migrate:007

# Production
npm run db:migrate:007:prod
```

## Files Modified/Created

### Backend
- `migrations/007_wallets.sql` - Database migration
- `worker/types.ts` - Added Wallet interface, updated Expense interface
- `worker/services/db.service.ts` - Added wallet CRUD methods, updated expense methods
- `worker/handlers/wallet.handler.ts` - New wallet API handlers
- `worker/handlers/expenses.handler.ts` - Updated to handle walletId
- `worker/router.ts` - Added wallet routes
- `worker/utils/validation.ts` - Updated expense schema to include walletId

### Frontend
- `src/types.ts` - Updated Expense interface
- `src/lib/wallet-service.ts` - New wallet API service
- `src/pages/WalletsPage.tsx` - New wallets management page
- `src/components/ExpenseForm.tsx` - Added wallet selector
- `src/components/Layout.tsx` - Added wallet navigation
- `src/App.tsx` - Added wallet route
- `package.json` - Added migration scripts

## Future Enhancements

Potential features to add:
- Wallet transfers (move money between wallets)
- Wallet-specific expense filtering
- Wallet balance history/timeline
- Multi-currency wallet support with conversion
- Wallet categories or tags
- Spending limits per wallet
- Wallet sharing between users

## Testing Checklist

- [ ] Create a new wallet
- [ ] Edit wallet name
- [ ] Edit wallet initial balance (verify current balance adjusts)
- [ ] Delete a wallet
- [ ] Create expense without wallet (verify it works)
- [ ] Create expense with wallet (verify balance decreases)
- [ ] Edit expense to change wallet (verify both wallet balances update)
- [ ] Edit expense to change amount (verify wallet balance updates)
- [ ] Edit expense to remove wallet (verify balance is restored)
- [ ] Delete expense with wallet (verify balance is restored)
- [ ] Check mobile responsive design
- [ ] Verify navigation on desktop and mobile
