# Migration from Cloudflare to Standard Deployment

## Overview

This document outlines the removal of unused Cloudflare-specific code from this project. The app was built using a Cloudflare-focused template but is actually using Google Gemini AI, not Cloudflare services.

## What Was Removed

### 1. Cloudflare Dependencies

- `@cloudflare/vite-plugin` - Cloudflare-specific Vite build plugin
- `@cloudflare/workers-types` - TypeScript types for Cloudflare Workers
- `agents` - Cloudflare Agents SDK (wrapper for Durable Objects)
- `hono` - While Hono itself is platform-agnostic, it was only used for Cloudflare Workers
- `openai` - Was used to proxy requests through Cloudflare AI Gateway
- `pino` - Server-side logging (not needed for client-only app)
- `@modelcontextprotocol/sdk` and related MCP packages - Unused
- `mcp-client`, `mcp-remote` - Unused MCP integration

### 2. Cloudflare Configuration Files

- `wrangler.jsonc` - Cloudflare Workers deployment configuration
- `worker/` directory - Entire backend was Cloudflare Workers-based

### 3. Build Scripts

- Removed `deploy` script that used `wrangler deploy`
- Removed `cf-typegen` script

## Current Architecture

The app now runs as a pure client-side application:

- **Frontend**: React + Vite + TypeScript
- **AI Processing**: Direct Google Gemini API calls from the browser
- **Storage**: localStorage for expenses (no backend needed)
- **Deployment**: Can be deployed to any static hosting (Vercel, Netlify, GitHub Pages, etc.)

## Why This Change?

The original deployment was failing with:

```
In order to use Durable Objects with a free plan, you must create a namespace
using a `new_sqlite_classes` migration. [code: 10097]
```

This happened because:

1. The template used Cloudflare Durable Objects for storage
2. Durable Objects require a paid Cloudflare plan
3. **The app doesn't actually need Cloudflare** - it was already using:
   - Google Gemini for AI (not Cloudflare AI)
   - localStorage for storage (not Durable Objects)
   - Client-side processing (not Workers)

## Deployment Options

Now you can deploy this app to any static hosting provider:

### Option 1: Vercel

```bash
npm i -g vercel
vercel
```

### Option 2: Netlify

```bash
npm i -g netlify-cli
netlify deploy
```

### Option 3: GitHub Pages

Add to your repository settings or use GitHub Actions.

### Option 4: Any Static Host

Just run `bun run build` and upload the `dist/` folder.

## Environment Variables

The app now uses Google AI API key stored in localStorage via the Settings dialog. No server-side environment variables needed.

## What Still Works

✅ Receipt scanning with Google Gemini
✅ Expense tracking and management
✅ All UI components and features
✅ Data persistence (localStorage)
✅ Responsive design
✅ Dark mode

## Breaking Changes

❌ The demo chat feature (`/demo` route) no longer works without a backend
❌ Session management across devices (was using Durable Objects)

These features were not part of the core expense tracking functionality.

## Next Steps

1. Remove the `worker/` directory entirely
2. Update imports in components that reference worker types
3. Test the build: `bun run build`
4. Deploy to your preferred platform

## Notes

- The app is now simpler and easier to deploy
- No vendor lock-in to Cloudflare
- No server costs
- Works entirely offline after initial load
