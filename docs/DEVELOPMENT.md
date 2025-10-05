# Development Guide

Complete guide for setting up and developing Focal locally.

## Prerequisites

- **Node.js** 18+ (recommend LTS version)
- **pnpm** 8+ - Install: `npm install -g pnpm`
- **Wrangler CLI** - Install: `pnpm add -g wrangler`
- **Cloudflare account** (free tier available)
- **Google AI Studio account** (for Gemini API key)

## Initial Setup

### 1. Clone and Install

```bash
git clone https://github.com/Creative-Geek/Focal.git
cd Focal
pnpm install
```

### 2. Environment Configuration

Create `.dev.vars` in the project root:

```bash
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
ENCRYPTION_KEY="your-encryption-key-min-32-chars"
NODE_ENV="development"
```

Generate secure secrets:

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate encryption key
openssl rand -base64 32
```

### 3. Database Setup

```bash
# Initialize local D1 database with schema
pnpm db:migrate

# Apply quantity column migration
pnpm db:migrate:002
```

## Running the Application

### Development Servers

```bash
# Run both frontend and backend concurrently
pnpm dev:full

# Or run separately:
# Terminal 1 - Frontend (port 3000)
pnpm dev

# Terminal 2 - Backend (port 8787)
pnpm dev:worker
```

Access the app:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8787

### First Account Setup

1. Navigate to http://localhost:3000/login
2. Click "Register" to create an account
3. Open Settings and add your Google Gemini API key
4. Start tracking expenses!

## Available Scripts

```bash
# Development
pnpm dev              # Frontend dev server
pnpm dev:worker       # Backend dev server
pnpm dev:full         # Both servers concurrently

# Building
pnpm build            # Production build
pnpm preview          # Preview production build

# Database
pnpm db:migrate       # Local migrations
pnpm db:migrate:prod  # Production migrations

# Code Quality
pnpm lint             # Run ESLint

# Deployment
pnpm deploy           # Deploy to Cloudflare
```

## Project Structure

```
focal/
├── src/                    # Frontend React app
│   ├── components/         # UI components
│   ├── pages/             # Route pages
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom hooks
│   └── lib/               # Utilities
├── worker/                # Backend API
│   ├── handlers/          # Route handlers
│   ├── services/          # Business logic
│   ├── middleware/        # Auth, CORS
│   └── utils/             # Helpers
├── migrations/            # Database schemas
├── public/                # Static assets
└── images/                # Screenshots
```

## Development Tips

### Hot Module Replacement

Vite provides instant HMR - changes reflect without full reload.

### Type Checking

```bash
# Run TypeScript type checking
npx tsc --noEmit
```

### Database Operations

```bash
# Query local database
wrangler d1 execute focal_expensi_db --local --command="SELECT * FROM expenses"

# Query production database
wrangler d1 execute focal_expensi_db --remote --command="SELECT * FROM users"
```

### View Logs

```bash
# Stream production logs
wrangler tail

# Filter by status
wrangler tail --status error
```

### Working with the API

The backend runs on port 8787 during development. Frontend automatically proxies `/api` requests through Vite configuration.

Example API call from frontend:

```typescript
const response = await fetch("/api/expenses");
```

This is proxied to `http://localhost:8787/api/expenses`.

## Troubleshooting

### Port Already in Use

```bash
# Use different port for frontend
pnpm dev -- --port 3001

# Use different port for backend
pnpm dev:worker --port 8788
```

### Database Issues

```bash
# Reset local database
rm -rf .wrangler/state
pnpm db:migrate
pnpm db:migrate:002
```

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules dist .wrangler
pnpm install
pnpm build
```

### API Key Issues

- Verify key is valid in Google AI Studio
- Check encryption key matches in `.dev.vars`
- Ensure key is saved in Settings dialog

## Tech Stack

### Frontend

- React 18, TypeScript, Vite
- TailwindCSS, shadcn/ui
- React Router, React Query, Zustand
- React Hook Form, Zod

### Backend

- Cloudflare Workers, Hono.js
- Cloudflare D1 (SQLite)
- Google Gemini API

### Tools

- ESLint, TypeScript 5.8
- Wrangler, pnpm

## Security Best Practices

- Never commit `.dev.vars` or secrets
- Use environment variables for sensitive data
- Validate all user inputs with Zod
- Follow principle of least privilege
- Keep dependencies updated

## Testing

Currently manual testing. Contributions for automated tests are welcome!

## Need Help?

- Check [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
- See [API.md](API.md) for API documentation
- Open an issue on GitHub for questions
