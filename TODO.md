# Full-Stack Migration Plan - Focal Finance Tracker

> **Goal**: Transform Focal from a client-side-only app to a full-stack application with Cloudflare Workers, D1 database, and user authentication.

## 📊 Project Status

**Current State**: Pure client-side React app with localStorage  
**Target State**: Full-stack app with user auth, server-side API storage, and persistent database  
**Database**: Cloudflare D1 (SQLite) - `focal_expensi_db` (85a073b1-3c48-4a21-bf35-68e7c473d654)

---

## 📋 Phase 1: Database Schema Design & Setup

### ✅ 1.1 Create D1 Database Schema

Create migration file: `migrations/001_initial_schema.sql`

```sql
-- users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- api_keys table (encrypted storage for Google Gemini API keys)
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  default_currency TEXT DEFAULT 'USD',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- expenses table
CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  merchant TEXT NOT NULL,
  date TEXT NOT NULL,
  total REAL NOT NULL,
  currency TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- line_items table
CREATE TABLE line_items (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
);

-- sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_line_items_expense_id ON line_items(expense_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

**Commands:**

```bash
# Local development
pnpm wrangler d1 execute focal_expensi_db --local --file=./migrations/001_initial_schema.sql

# Production
pnpm wrangler d1 execute focal_expensi_db --remote --file=./migrations/001_initial_schema.sql
```

### ✅ 1.2 Configure wrangler.toml

Update `wrangler.toml` with D1 binding and Worker configuration:

```toml
name = "focal-finance-tracker"
main = "worker/index.ts"
compatibility_date = "2025-10-04"

# Serve frontend assets
[assets]
directory = "./dist"
binding = "ASSETS"

# D1 Database binding
[[d1_databases]]
binding = "DB"
database_name = "focal_expensi_db"
database_id = "85a073b1-3c48-4a21-bf35-68e7c473d654"

# Environment variables (use wrangler secrets for production)
[vars]
NODE_ENV = "development"
```

**Production Secrets:**

```bash
pnpm wrangler secret put JWT_SECRET
pnpm wrangler secret put ENCRYPTION_KEY
```

---

## 📋 Phase 2: Backend Infrastructure (Cloudflare Workers)

### ✅ 2.1 Install Backend Dependencies

```bash
pnpm add hono @hono/node-server bcryptjs jsonwebtoken
pnpm add -D @types/bcryptjs @types/jsonwebtoken @cloudflare/workers-types
```

### ✅ 2.2 Create Worker Directory Structure

```
worker/
├── index.ts                    # Main Worker entry point
├── router.ts                   # API route definitions
├── types.ts                    # Backend type definitions
├── middleware/
│   ├── auth.ts                 # JWT authentication middleware
│   └── cors.ts                 # CORS configuration
├── handlers/
│   ├── auth.handler.ts         # Login, signup, logout
│   ├── expenses.handler.ts     # CRUD for expenses
│   ├── apiKeys.handler.ts      # API key management
│   └── receipts.handler.ts     # Receipt processing proxy
├── services/
│   ├── db.service.ts           # D1 database queries
│   ├── auth.service.ts         # Password hashing, JWT
│   ├── encryption.service.ts   # API key encryption
│   └── gemini.service.ts       # Google Gemini integration
└── utils/
    ├── response.ts             # Standard API responses
    └── validation.ts           # Request validation
```

### ✅ 2.3 API Endpoints Design

**Authentication Routes:**

- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/logout` - Invalidate session token
- `GET /api/auth/me` - Get current user profile

**Expense Routes (Protected):**

- `GET /api/expenses` - Get all user expenses
- `GET /api/expenses/:id` - Get single expense
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

**Receipt Processing (Protected):**

- `POST /api/receipts/process` - Process receipt with Gemini AI

**Settings Routes (Protected):**

- `GET /api/settings/api-key` - Check if API key exists
- `PUT /api/settings/api-key` - Save/update encrypted API key
- `DELETE /api/settings/api-key` - Remove API key
- `GET /api/settings/currency` - Get default currency
- `PUT /api/settings/currency` - Update default currency

### ✅ 2.4 Implementation Files

**Key Files to Create:**

1. **worker/index.ts** - Main entry point with Hono app
2. **worker/middleware/auth.ts** - JWT verification middleware
3. **worker/services/auth.service.ts** - Bcrypt password hashing, JWT generation
4. **worker/services/db.service.ts** - D1 query wrappers
5. **worker/services/encryption.service.ts** - Encrypt/decrypt API keys
6. **worker/handlers/\*.ts** - Route handlers for each endpoint

---

## 📋 Phase 3: Frontend Migration

### ✅ 3.1 Create Authentication Components

**New Files:**

```
src/
├── components/
│   ├── AuthForm.tsx           # Reusable login/signup form
│   ├── ProtectedRoute.tsx     # Route guard component
│   └── UserMenu.tsx           # User profile dropdown in header
├── contexts/
│   └── AuthContext.tsx        # Auth state management
├── hooks/
│   └── useAuth.ts             # Auth hooks (login, logout, etc.)
└── pages/
    ├── LoginPage.tsx          # Login page
    └── SignupPage.tsx         # Signup page
```

### ✅ 3.2 Convert ExpenseService to API Client

**Modify:** `src/lib/expense-service.ts`

Replace localStorage operations with fetch calls:

```typescript
class ExpenseService {
  private baseUrl = "/api";

  async processReceipt(base64Image: string) {
    const response = await fetch(`${this.baseUrl}/receipts/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ image: base64Image }),
    });
    return response.json();
  }

  async saveExpense(data: ExpenseData) {
    /* POST /api/expenses */
  }
  async getExpenses() {
    /* GET /api/expenses */
  }
  async updateExpense(id: string, data: ExpenseData) {
    /* PUT */
  }
  async deleteExpense(id: string) {
    /* DELETE */
  }
}
```

### ✅ 3.3 Update App Routes

**Modify:** `src/App.tsx`

```typescript
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/signup" element={<SignupPage />} />
  <Route element={<ProtectedRoute />}>
    <Route path="/" element={<HomePage />} />
    <Route path="/expenses" element={<ExpensesPage />} />
  </Route>
</Routes>
```

### ✅ 3.4 Update Settings Dialog

**Modify:** `src/components/SettingsDialog.tsx`

- Change API key storage to call `PUT /api/settings/api-key`
- Update currency settings to use backend API
- Add user profile section (email, change password)

### ✅ 3.5 Remove localStorage Dependencies

**Files to Update:**

- `src/lib/expense-service.ts` - Remove localStorage, use API
- `src/components/SettingsDialog.tsx` - Store API key server-side
- Keep `src/hooks/use-theme.ts` - Theme can stay in localStorage (UI-only)

---

## 📋 Phase 4: Security Implementation

### ✅ 4.1 API Key Encryption

**Create:** `worker/services/encryption.service.ts`

Use Web Crypto API or crypto-js to encrypt Gemini API keys before storing in D1.

### ✅ 4.2 Password Security

**Implement in:** `worker/services/auth.service.ts`

- Use bcrypt with 10-12 salt rounds
- Never log or expose password hashes
- Validate password strength (min 8 chars, etc.)

### ✅ 4.3 CORS Configuration

**Create:** `worker/middleware/cors.ts`

```typescript
const corsConfig = {
  origin: ["https://your-domain.workers.dev", "http://localhost:3000"],
  credentials: true,
};
```

### ✅ 4.4 Rate Limiting

**Optional:** Implement rate limiting for auth endpoints using Workers KV or in-memory Map.

---

## 📋 Phase 5: Data Migration Tool

### ✅ 5.1 Create Migration Utility

**Create:** `src/components/DataMigrationDialog.tsx`

1. Check for localStorage data on app load
2. Show migration prompt if data exists
3. User creates account or logs in
4. Import expenses to backend
5. Clear localStorage after confirmation

### ✅ 5.2 Export Feature

Add "Export Data" button to download localStorage expenses as JSON before migration.

---

## 📋 Phase 6: Development Workflow

### ✅ 6.1 Update Vite Configuration

**Modify:** `vite.config.ts`

Add proxy to forward API calls to Workers dev server:

```typescript
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
```

### ✅ 6.2 Development Commands

**Update:** `package.json` scripts

```json
{
  "scripts": {
    "dev": "vite",
    "dev:worker": "wrangler dev --local",
    "dev:full": "concurrently \"pnpm dev\" \"pnpm dev:worker\"",
    "build": "tsc && vite build",
    "deploy": "pnpm run build && wrangler deploy"
  }
}
```

**Install:**

```bash
pnpm add -D concurrently
```

---

## 📋 Phase 7: Deployment

### ✅ 7.1 Database Setup

```bash
# Create schema on remote D1
pnpm wrangler d1 execute focal_expensi_db --remote --file=./migrations/001_initial_schema.sql

# Verify tables
pnpm wrangler d1 execute focal_expensi_db --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### ✅ 7.2 Set Production Secrets

```bash
pnpm wrangler secret put JWT_SECRET
# Enter a strong random string (e.g., generated with openssl rand -base64 32)

pnpm wrangler secret put ENCRYPTION_KEY
# Enter a strong encryption key
```

### ✅ 7.3 Configure GitHub Deployment

**Deployment Strategy**: This project uses GitHub push for automatic deployment via Cloudflare Pages.

1. **Connect Repository to Cloudflare Pages**:

   - Go to Cloudflare Dashboard → Pages
   - Connect your GitHub repository (`Creative-Geek/Focal`)
   - Configure build settings:
     - Build command: `pnpm run build`
     - Build output directory: `dist`
     - Root directory: `/` (leave empty)

2. **Add Environment Variables in Cloudflare Pages**:

   - `NODE_VERSION`: `18` or `20`
   - Add secrets via Pages settings (JWT_SECRET, ENCRYPTION_KEY)

3. **Deploy**:

   ```bash
   git add .
   git commit -m "feat: add full-stack backend"
   git push origin main
   ```

   Cloudflare Pages will automatically build and deploy on push to `main`.

### ✅ 7.4 Alternative: Manual Worker Deployment

If you prefer manual Cloudflare Workers deployment (not using Pages):

```bash
pnpm run build
pnpm wrangler deploy
```

The Worker serves both the API and the frontend assets from the `dist/` folder.

**Note**: With GitHub deployment, you get automatic deploys on every push, preview deployments for PRs, and easy rollbacks.

---

## 📋 Phase 8: Testing & Validation

### ✅ 8.1 Test Checklist

**Authentication:**

- [ ] User signup with email validation
- [ ] User login with correct credentials
- [ ] Login fails with wrong credentials
- [ ] JWT token stored in httpOnly cookie
- [ ] Protected routes redirect to login
- [ ] Logout clears session

**Expenses:**

- [ ] Create expense via API
- [ ] Get all expenses for logged-in user
- [ ] Update expense
- [ ] Delete expense
- [ ] Expenses are user-isolated (User A can't see User B's expenses)

**Receipt Processing:**

- [ ] Upload receipt image
- [ ] Gemini AI processes with user's API key
- [ ] Extracted data pre-fills form
- [ ] Save processed receipt as expense

**Security:**

- [ ] API key stored encrypted in database
- [ ] Password hashed with bcrypt
- [ ] CORS properly configured
- [ ] JWT signature verified on protected routes

**Migration:**

- [ ] Import localStorage data to backend
- [ ] Verify all expenses migrated correctly
- [ ] localStorage cleared after migration

---

## 📋 Phase 9: Clean Up & Documentation

### ✅ 9.1 Remove Old Files

Delete unused files from previous client-only architecture:

```bash
# Remove old worker directory if it exists and is outdated
rm -rf worker/  # Only if it contains old Durable Objects code

# Keep the new worker/ directory we create in Phase 2
```

### ✅ 9.2 Update README.md

- [ ] Update architecture description
- [ ] Add database setup instructions
- [ ] Document environment variables
- [ ] Update deployment instructions
- [ ] Add API documentation

### ✅ 9.3 Update MIGRATION.md

Create new section about migrating from localStorage to D1.

### ✅ 9.4 Remove Demo Page

**Optional:** Remove or rebuild `/demo` route since it requires backend.

---

## 🔧 Dependencies Summary

### Backend (Worker)

```json
{
  "hono": "^4.x",
  "bcryptjs": "^2.x",
  "jsonwebtoken": "^9.x",
  "@cloudflare/workers-types": "^4.x"
}
```

### Frontend (Already Installed)

```json
{
  "react-router-dom": "^6.30.0",
  "zod": "^3.x",
  "@google/generative-ai": "^0.x"
}
```

---

## ⚠️ Important Notes

1. **Cloudflare D1 Database**: Already created - `focal_expensi_db` (85a073b1-3c48-4a21-bf35-68e7c473d654)
2. **JWT vs Sessions**: Using JWT with httpOnly cookies for security
3. **API Key Security**: Gemini API keys encrypted in database, decrypted only when needed
4. **Backward Compatibility**: Migration tool for existing localStorage users
5. **Pricing**: Cloudflare Workers free tier (100k requests/day, 5GB D1 storage)
6. **Authentication**: No OAuth initially - start with email/password, add OAuth later if needed

---

## 🎯 Success Criteria

- [ ] Users can create accounts and log in
- [ ] Expenses sync across devices
- [ ] Receipt scanning works with user's API key
- [ ] All data persisted in D1 database
- [ ] Secure authentication with JWT
- [ ] Existing localStorage users can migrate seamlessly
- [ ] App deployed via GitHub push to Cloudflare Pages
- [ ] Automatic deployments on push to main branch

---

## 📅 Estimated Timeline

- **Phase 1-2**: Database + Backend (2-3 days)
- **Phase 3**: Frontend Auth UI (2 days)
- **Phase 4**: Security Hardening (1 day)
- **Phase 5**: Migration Tool (1 day)
- **Phase 6-7**: Dev Setup + Deployment (1 day)
- **Phase 8**: Testing (1-2 days)
- **Phase 9**: Documentation (1 day)

**Total**: ~10-12 days of focused development

---

## 🚀 Next Steps

1. Start with Phase 1: Create database schema
2. Set up wrangler.toml with D1 binding
3. Build Worker backend (Phase 2)
4. Update frontend for authentication (Phase 3)
5. Test thoroughly (Phase 8)
6. Deploy! (Phase 7)

---

> **Ready to begin?** Start by creating the database schema in `migrations/001_initial_schema.sql` and running it against your D1 database!
