# Focal: AI Receipt Scanner & Expense Tracker

> **Live at:** [focal.creative-geek.tech](https://focal.creative-geek.tech)

A full-stack, AI-powered receipt scanner that instantly captures, analyzes, and organizes your expenses with a single photo. Built with React, Cloudflare Workers, D1 database, and Google Gemini AI.

Focal is an elegant financial tracker designed for speed and simplicity. Snap a photo of any receipt, and AI automatically extracts merchant, total, date, and line items. Review the data in a clean interface, then save it to your personal cloud database. Access your expenses from any device with secure user authentication.

## ✨ Features

- 📸 **AI-Powered Scanning** - Camera-first interface for instant receipt capture
- 🤖 **Smart Extraction** - Google Gemini AI extracts merchant, total, date, and line items
- ✏️ **Review & Edit** - Clean dialog for verifying and correcting data
- 💾 **Cloud Sync** - All expenses saved to Cloudflare D1 database
- 🔐 **Secure Auth** - User accounts with JWT authentication
- 📊 **Dashboard** - Visualize spending patterns with charts
- 🌓 **Dark Mode** - Beautiful light and dark themes
- 📱 **Responsive** - Flawless on desktop, tablet, and mobile
- ⚡ **Edge Computing** - Fast, globally distributed on Cloudflare's network

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Cloudflare account (free tier works)
- Google Gemini API key ([get one here](https://makersuite.google.com/app/apikey))

### Local Development

1. **Clone and install:**

   ```bash
   git clone https://github.com/Creative-Geek/Focal.git
   cd Focal
   pnpm install
   ```

2. **Login to Cloudflare:**

   ```bash
   pnpm wrangler login
   ```

3. **Set up local database:**

   ```bash
   pnpm db:migrate
   ```

4. **Start development servers:**

   ```bash
   pnpm dev:full
   ```

   Frontend: <http://localhost:3000>  
   Backend: <http://localhost:8787>

5. **Create account and add your Gemini API key in Settings**

📖 **Detailed setup:** See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for production deployment guide.

## Key Features

- **AI-Powered Scanning:** Instantly capture receipt data using your device's camera.
- **Automatic Data Extraction:** Leverages a vision-enabled LLM to extract merchant, total, date, and line items.
- **Intuitive Review & Edit:** A clean dialog allows for quick verification and correction of extracted data.
- **Session-Based Tracking:** All expenses are saved for your current session, providing a quick overview of recent spending.
- **Minimalist Dashboard:** A clean, uncluttered interface to view and manage your expenses.
- **Responsive Design:** Flawless experience on desktop, tablet, and mobile devices.
- **Built on Cloudflare:** High-performance and scalable, running on the Cloudflare edge network.

## 🛠️ Technology Stack

**Frontend:**

- React 18 + TypeScript 5.8 + Vite 6
- Tailwind CSS + shadcn/ui
- React Router DOM + Framer Motion
- Recharts for data visualization
- React Webcam for camera access

**Backend:**

- Cloudflare Workers (serverless API)
- Hono.js (lightweight HTTP framework)
- JWT authentication with bcrypt
- D1 database (SQLite)

**AI:**

- Google Gemini 2.5 Flash
- Server-side API key encryption
- Structured JSON extraction

**Infrastructure:**

- Cloudflare Pages (automatic GitHub deployments)
- Cloudflare D1 (persistent database)
- Edge computing (low latency globally)

## 📖 Usage

1. **Sign Up** - Create an account at [focal.creative-geek.tech](https://focal.creative-geek.tech)
2. **Add API Key** - Go to Settings and paste your Google Gemini API key
3. **Scan Receipt** - Use camera or upload image
4. **Review Data** - Check extracted merchant, total, date, items
5. **Save** - Expense is stored in your cloud database
6. **Track** - View all expenses in the dashboard with charts

## 📁 Project Structure

```
Focal/
├── src/                      # Frontend React application
│   ├── pages/                # Main routes (HomePage, ExpensesPage, LoginPage)
│   ├── components/           # React components + shadcn/ui
│   ├── lib/                  # Core services (expense-service.ts)
│   ├── hooks/                # Custom hooks (useAuth, useTheme)
│   └── types.ts              # TypeScript interfaces
├── worker/                   # Cloudflare Workers backend
│   ├── handlers/             # API route handlers
│   ├── middleware/           # Auth, CORS middleware
│   ├── services/             # Business logic (auth, db, gemini)
│   └── index.ts              # Worker entry point
├── migrations/               # D1 database schema
├── DEPLOYMENT.md            # Production deployment guide
└── TODO.md                  # Development roadmap
```

## 🚢 Deployment

The app auto-deploys to Cloudflare Pages on every push to main branch.

**Production deployment:**

```bash
# Set production secrets
pnpm setup:prod

# Deploy database schema
pnpm db:migrate:prod

# Push to GitHub (triggers auto-deploy)
git push origin main
```

**Custom domain setup:**

1. Cloudflare Pages → Custom domains → Add `focal.creative-geek.tech`
2. DNS: Add CNAME `focal` → `focal-finance-tracker.pages.dev`
3. Wait 5-10 minutes for SSL provisioning

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for detailed instructions.

## � Install as a PWA

Focal is installable as a Progressive Web App (PWA) on desktop and mobile.

- In Chrome/Edge, click the “Install app” icon in the address bar or use the browser menu → Install Focal.
- On iOS Safari, tap Share → Add to Home Screen.

Notes:

- The app uses a service worker with auto updates. New versions are applied after closing all tabs or on next launch.
- API calls to `/api/*` are never cached; offline mode allows you to open the UI, but network actions require connectivity.

Local testing:

1. Start the dev servers: `pnpm dev:full`
2. Open <http://localhost:3000> and check Application → Manifest in DevTools. You should see “Installable”.
3. To test production behavior, run `pnpm build` then `pnpm preview` and open the preview URL.

## �🔐 Security

- User passwords hashed with bcrypt
- API keys encrypted at rest in D1 database
- JWT authentication with httpOnly cookies (production)
- Bearer token authentication (development)
- CORS protection for trusted domains only
- SQL injection prevention via D1 prepared statements

## 🎯 Roadmap

- [x] Full-stack migration to Cloudflare Workers + D1
- [x] User authentication with JWT
- [x] Encrypted API key storage
- [x] Custom domain support
- [ ] OAuth login (Google, GitHub)
- [ ] Export expenses (CSV, PDF)
- [ ] Multi-currency support
- [ ] Expense categories management
- [ ] Budget tracking and alerts
- [ ] Mobile app (React Native)

See [`TODO.md`](./TODO.md) for detailed development plan.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [`LICENSE`](./LICENSE) file for details.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for beautiful components
- [Google Gemini](https://ai.google.dev/) for AI capabilities
- [Cloudflare](https://cloudflare.com/) for infrastructure
- [Hono](https://hono.dev/) for elegant API framework

## 📧 Contact

**Project Link:** [github.com/Creative-Geek/Focal](https://github.com/Creative-Geek/Focal)  
**Live Demo:** [focal.creative-geek.tech](https://focal.creative-geek.tech)

---

Built with ❤️ using React, Cloudflare Workers, and Google Gemini AI

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
