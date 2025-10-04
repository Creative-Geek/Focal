# Deployment Guide — Focal

## Overview

This app is designed to run as a full-stack deployment on Cloudflare Pages (frontend) with a Cloudflare Workers backend and a D1 (SQLite) database.

If you use a custom domain, it will look like: <https://app.yourdomain.com> (example).

## Deployment Architecture

- Frontend: React + Vite → Cloudflare Pages (automatic deployment on git push)
- Backend: Cloudflare Workers (Hono.js) → Serverless API
- Database: Cloudflare D1 (SQLite)
- AI: Google Gemini 2.5 Flash (proxied via backend)

## Prerequisites

1. Cloudflare account with Pages enabled
2. Source repository (GitHub/GitLab) connected to Cloudflare Pages
3. A Cloudflare D1 database (you will name it; example: `YOUR_D1_DB_NAME`)
4. Wrangler CLI installed globally (and pnpm installed locally)
   - Install Wrangler: `pnpm add -g wrangler` (or `npm i -g wrangler`)
   - Verify: `wrangler --version`

## Step 1: Set Up Production Secrets

Production requires two critical secrets for security:

### Generate Secrets

```bash
# Generate a strong JWT secret (32+ characters)
openssl rand -base64 32

# Generate encryption key (32+ characters)
openssl rand -base64 32
```

### Set Secrets in Cloudflare

```bash
# Set JWT secret
pnpm wrangler secret put JWT_SECRET
# Paste the generated JWT secret when prompted

# Set encryption key
pnpm wrangler secret put ENCRYPTION_KEY
# Paste the generated encryption key when prompted
```

Important: These secrets are stored securely in Cloudflare and never exposed in code or logs.

## Step 2: Set Up Database

### Local Database (development)

```bash
# Create local D1 database with schema
pnpm db:migrate
```

### Production Database

```bash
# Create production D1 database with schema
pnpm db:migrate:prod
```

Note: Configure your D1 binding in `wrangler.toml`.

- Database name: `YOUR_D1_DB_NAME`
- Database ID: `YOUR_D1_DB_ID` (provided by Cloudflare)

If you change the database name, update any scripts in `package.json` that reference it (`db:migrate`, `db:migrate:prod`).

## Step 3: Configure Cloudflare Pages

### Connect GitHub Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
2. Click "Create a project" → "Connect to Git"
3. Select your repository: `<your-org-or-user>/<your-repo>`
4. Configure build settings:
   - **Framework preset**: Vite
   - **Build command**: `pnpm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (project root)

### Configure Environment Variables

In Cloudflare Pages settings, add:

- `NODE_ENV` = `production`

Note: JWT_SECRET and ENCRYPTION_KEY are set via Wrangler secrets (not Pages environment variables).

### Enable server-side code

You have two common options for server-side code on Cloudflare:

- Option A — Pages Functions: Place your API handlers in a `functions/` directory at the project root. Pages will build and deploy these automatically.
- Option B — Standalone Worker: Keep backend code under a directory like `worker/` and deploy it with Wrangler (`pnpm run deploy`). This repository uses this approach.

## Step 4: Set Up Custom Domain

### Add Custom Domain in Cloudflare Pages

1. Go to your Pages project → Settings → Custom domains
2. Click "Set up a custom domain"
3. Enter your custom hostname, e.g., `app.yourdomain.com`
4. Cloudflare will provide a CNAME target (usually `<your-project>.pages.dev`)

### Configure DNS

In your Cloudflare DNS settings for your apex domain (e.g., `yourdomain.com`):

1. Add a CNAME record:

   - **Type**: CNAME
   - **Name**: `app` (or your chosen subdomain)
   - **Target**: `<your-project>.pages.dev` (the target provided by Pages)
   - **Proxy status**: Proxied (orange cloud)
   - **TTL**: Auto

2. Wait 5-10 minutes for DNS propagation
3. Cloudflare will automatically provision an SSL certificate

## Step 5: Deploy

### Automatic Deployment (Recommended)

Every push to the default branch (e.g., `main`) triggers automatic deployment:

```bash
git add .
git commit -m "feat: deploy to production"
git push origin main
```

Cloudflare Pages will:

1. Pull latest code from GitHub
2. Run `pnpm run build`
3. Deploy to your Pages domain or custom domain
4. Update Workers backend automatically

### Manual Deployment

```bash
# Build the frontend
pnpm run build

# Deploy the Workers backend (uses wrangler)
pnpm run deploy
```

## Step 6: Verify Deployment

### Check Deployment Status

1. Go to Cloudflare Pages dashboard
2. View deployment logs for build status
3. Check that deployment succeeded

### Test Production Site

Visit your deployed URL (e.g., <https://app.yourdomain.com>) and test:

- ✅ Homepage loads
- ✅ User registration works
- ✅ Login/logout works
- ✅ Receipt scanning with Gemini API
- ✅ Expenses save to database
- ✅ Data persists after logout/login
- ✅ Dark/light theme works

### Check API Endpoints

```bash
# Test health endpoint (replace with your domain)
curl https://app.yourdomain.com/api/health

# Expected: {"status":"ok"}
```

## Troubleshooting

### Build Fails

- Check Cloudflare Pages build logs
- Verify `pnpm run build` works locally
- Ensure all dependencies are in `package.json` (not devDependencies if needed for build)

### API Not Working

- Verify Workers deployment succeeded
- Check wrangler.toml configuration
- Ensure D1 database binding is correct
- Check Workers logs in Cloudflare dashboard

### Authentication Issues

- Verify JWT_SECRET is set: `pnpm wrangler secret list`
- Check CORS configuration allows your domain
- Verify localStorage is working (not disabled by browser)

### Database Errors

- Ensure database migration ran successfully
- Check D1 database exists: `pnpm wrangler d1 list`
- Verify database ID in wrangler.toml matches your database

### Custom Domain Not Working

- Wait 10-15 minutes for DNS propagation
- Verify CNAME record is correct
- Check SSL certificate status in Cloudflare Pages
- Ensure proxy status is enabled (orange cloud)

## Development Workflow

### Local Development

```bash
# Terminal 1: Frontend dev server
pnpm dev

# Terminal 2: Workers dev server with local D1
pnpm dev:worker

# Or run both concurrently
pnpm dev:full
```

Frontend runs on: <http://localhost:3000>  
Backend runs on: <http://localhost:8787>  
Vite proxies `/api` requests to Workers during development.

### Testing Before Deploy

```bash
# Run linter
pnpm run lint

# Build production version
pnpm run build

# Preview production build locally
pnpm run preview
```

Note: The preview script currently runs `bun run build` before `vite preview`. Ensure Bun is installed or adjust the script to run `pnpm run build && vite preview` on your machine.

## Monitoring

### View Logs

```bash
# View Workers logs
pnpm wrangler tail

# View specific deployment logs
pnpm wrangler tail --env production
```

### Database Queries

```bash
# Query production database
pnpm wrangler d1 execute YOUR_D1_DB_NAME --remote --command="SELECT * FROM users LIMIT 5"

# Check expense count
pnpm wrangler d1 execute YOUR_D1_DB_NAME --remote --command="SELECT COUNT(*) as count FROM expenses"
```

## Security Checklist

Before going live:

- ✅ JWT_SECRET set in production
- ✅ ENCRYPTION_KEY set in production
- ✅ NODE_ENV set to "production"
- ✅ CORS only allows trusted domains
- ✅ HTTPS enabled (automatic with Cloudflare)
- ✅ API keys encrypted in database
- ✅ Password hashing with bcrypt
- ✅ SQL injection protection (D1 prepared statements)

## Rollback

If deployment breaks production:

1. Go to Cloudflare Pages → Deployments
2. Find the last working deployment
3. Click "Rollback to this deployment"
4. Site reverts to previous version instantly

## Cost Estimate

Cloudflare Free Tier (as of writing; verify current limits):

- Pages: generous free tier for requests
- Workers: daily request quota on free plan
- D1: storage/read limits on free plan
- Free SSL certificate
- Custom domains supported

Most hobby/small projects fit within the free tier, but check Cloudflare’s latest pricing and limits.

## Support

For issues:

1. Check deployment logs in Cloudflare dashboard
2. Review Workers logs: `pnpm wrangler tail`
3. Check D1 database status: `pnpm wrangler d1 list`
4. Review `TODO.md` for known issues

---

Last updated: October 4, 2025  
Domain: <https://app.yourdomain.com> (if configured)  
Status: Production Ready ✅
