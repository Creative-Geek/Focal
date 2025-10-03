# Cloudflare Removal - TODO List

## ✅ Completed

1. ✅ Removed `@cloudflare/vite-plugin` from vite.config.ts
2. ✅ Removed Cloudflare dependencies from package.json:
   - @cloudflare/vite-plugin
   - @cloudflare/workers-types
   - agents (Cloudflare Agents SDK)
   - hono (only needed for Workers)
   - openai (was proxying through Cloudflare)
   - pino (server-side logging)
   - MCP packages (unused)
3. ✅ Updated expense-service.ts to call Google Gemini directly from client
4. ✅ Removed deployment scripts (deploy, cf-typegen)
5. ✅ Created MIGRATION.md documentation

## 🔄 Still TODO

### 1. Remove Worker Directory (Critical)
The entire `worker/` directory needs to be deleted as it contains Cloudflare Workers code:
```bash
rm -rf worker/
```

This includes:
- worker/agent.ts (Cloudflare Agents SDK)
- worker/app-controller.ts (Durable Objects)
- worker/chat.ts (OpenAI proxy)
- worker/index.ts (Worker entry point)
- worker/userRoutes.ts (API routes)
- worker/types.ts (will need to keep type definitions elsewhere)
- worker/mcp-client.ts (MCP integration)
- worker/tools.ts
- worker/config.ts
- worker/core-utils.ts
- worker/utils.ts

### 2. Move Type Definitions
Before deleting worker/, extract type definitions to src:
- Create `src/types.ts` with Expense, LineItem interfaces
- Update imports in all components

### 3. Remove Cloudflare Configuration
Delete these files:
- `wrangler.jsonc` - Cloudflare Workers configuration
- `tsconfig.worker.json` - TypeScript config for worker
- `.dev.vars` (if it exists) - Cloudflare environment variables

### 4. Update Component Imports
Files that import from worker/ need updates:
- `src/lib/expense-service.ts` - Already updated ✅
- `src/lib/chat.ts` - Remove or update (demo chat feature)
- `src/pages/DemoPage.tsx` - Remove or disable (requires backend)
- Any other files importing from `../../worker/types`

### 5. Handle Demo Chat Feature
The `/demo` route uses chat features that require a backend. Options:
- **Option A**: Remove DemoPage.tsx and `/demo` route entirely
- **Option B**: Keep it but add a notice that it requires backend setup
- **Option C**: Convert it to use Google Gemini directly (like receipts)

Recommended: **Option A** (remove it, as it's marked as a dummy page)

### 6. Update App Router
Remove `/demo` route from `src/App.tsx` if keeping demo page disabled

### 7. Update README.md
- Remove Cloudflare deployment instructions
- Remove references to Cloudflare Workers, Durable Objects, AI Gateway
- Update with new deployment options (Vercel, Netlify, etc.)
- Update technology stack section
- Remove "Deploy to Cloudflare" button

### 8. Clean Up Unused Assets
- `src/assets/Cloudflare_Logo.svg` - Can be removed

### 9. Update package.json Scripts
Already done ✅, but verify:
- ✅ Removed `deploy` script
- ✅ Removed `cf-typegen` script
- ✅ Kept `dev`, `build`, `preview`

### 10. Run Clean Install
After all changes:
```bash
rm -rf node_modules bun.lock
bun install
bun run build
```

### 11. Test the Build
Ensure everything compiles:
```bash
bun run build
bun run preview
```

### 12. Update Footer/UI Text
Files that mention "Cloudflare" in the UI:
- `src/components/Layout.tsx` - "Built with ❤️ at Cloudflare" message
- `src/pages/DemoPage.tsx` - References to Cloudflare Agents SDK

## 📝 Quick Migration Script

```bash
# 1. Remove worker directory
rm -rf worker/

# 2. Remove Cloudflare configs
rm -f wrangler.jsonc tsconfig.worker.json

# 3. Remove Cloudflare logo
rm -f src/assets/Cloudflare_Logo.svg

# 4. Clean install
rm -rf node_modules bun.lock
bun install

# 5. Test build
bun run build
```

## ⚠️ Breaking Changes

After completing all steps:
- ❌ Demo chat page will not work (no backend)
- ❌ Cannot deploy to Cloudflare Workers/Pages
- ✅ Can deploy to any static hosting
- ✅ Receipt scanning still works (Google Gemini)
- ✅ All expense tracking features still work (localStorage)

## 🎯 Final Architecture

**Before**: Cloudflare Workers + Durable Objects + Cloudflare AI Gateway  
**After**: Pure client-side React app + Google Gemini API + localStorage

This is simpler, cheaper (no server costs), and more portable!
