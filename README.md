<div align="center">
  <img src="public/focal-icon.svg" alt="Focal Logo" width="120" height="120" />
  
  # Focal Finance Tracker

A modern, privacy-focused expense tracking Progressive Web App (PWA) with AI-powered receipt scanning.

![Dashboard](images/dashboard.png)

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://focal.creative-geek.tech)
[![License](https://img.shields.io/badge/license-MIT-blue)]()

</div>

## ✨ Features

- 📸 **AI Receipt Scanning** - Extract expense details from photos using Gemini 2.5 (Pro, Flash, or Flash Lite)
- 💰 **Expense Tracking** - Manage expenses with categories, amounts, and notes
- 🔐 **Secure Auth** - JWT-based authentication with bcrypt password hashing
- 🌓 **Dark/Light Theme** - Beautiful UI with theme persistence
- 📱 **Progressive Web App** - Install on any device, works offline
- 🔒 **End-to-End Security** - Encrypted API keys and secure token storage
- ⚡ **Edge-First** - Deployed on Cloudflare's global network

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/Creative-Geek/Focal.git
cd Focal

# Install dependencies
pnpm install

# Set up environment (see DEVELOPMENT.md)
# Create .dev.vars with JWT_SECRET and ENCRYPTION_KEY

# Initialize database
pnpm db:migrate && pnpm db:migrate:002

# Run development server
pnpm dev:full
```

Visit http://localhost:3000 to get started!

## 📸 Screenshots

<div align="center">

### Dashboard

![Dashboard View](images/dashboard.png)

### Home Page

![Home Page](images/home_page.png)

### Add Expense

![Add Expense](images/add_expense.png)

</div>

## 🛠️ Tech Stack

**Frontend:** React 18 • TypeScript • Vite • TailwindCSS • shadcn/ui

**Backend:** Cloudflare Workers • Hono.js • D1 (SQLite) • Google Gemini AI

**Tools:** ESLint • Wrangler • pnpm

## 📚 Documentation

- **[Development Guide](DEVELOPMENT.md)** - Setup, configuration, and local development
- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment to Cloudflare
- **[API Reference](API.md)** - Complete API documentation
- **[Contributing](CONTRIBUTING.md)** - Guidelines for contributors

## 🔒 Security

- Password hashing with bcrypt
- JWT token authentication
- AES-256-GCM API key encryption
- SQL injection protection
- CORS configuration
- Input validation with Zod

## 🌐 Browser Support

Chrome/Edge 90+ • Firefox 88+ • Safari 14+ • Opera 76+

## 📝 License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🙏 Acknowledgments

Built with [React](https://react.dev), [Cloudflare](https://cloudflare.com), [shadcn/ui](https://ui.shadcn.com), [Google Gemini](https://ai.google.dev), and [Hono](https://hono.dev)

---

<div align="center">

**[Live Demo](https://focal.creative-geek.tech)** • **[Documentation](DEVELOPMENT.md)** • **[Report Bug](https://github.com/Creative-Geek/Focal/issues)**

Made with ❤️ by Creative Geek

</div>
