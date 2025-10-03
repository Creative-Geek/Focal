# Focal: AI Receipt Scanner & Expense Tracker

A minimalist, AI-powered receipt scanner that instantly captures, analyzes, and organizes your expenses with a single photo.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Creative-Geek/Focal)

Focal is an elegant, minimalist financial tracker designed for speed and simplicity. Its core purpose is to eliminate the friction of expense tracking by leveraging AI. The user is immediately presented with a camera interface to snap a photo of a receipt. This image is processed by a vision-enabled LLM on Cloudflare's edge network to extract structured data (merchant, total, date, line items). The user then reviews and confirms the extracted data in a clean, intuitive dialog before it's saved. A secondary view provides a beautifully simple dashboard to visualize and manage all captured expenses for the session.

## Key Features

- **AI-Powered Scanning:** Instantly capture receipt data using your device's camera.
- **Automatic Data Extraction:** Leverages a vision-enabled LLM to extract merchant, total, date, and line items.
- **Intuitive Review & Edit:** A clean dialog allows for quick verification and correction of extracted data.
- **Session-Based Tracking:** All expenses are saved for your current session, providing a quick overview of recent spending.
- **Minimalist Dashboard:** A clean, uncluttered interface to view and manage your expenses.
- **Responsive Design:** Flawless experience on desktop, tablet, and mobile devices.
- **Built on Cloudflare:** High-performance and scalable, running on the Cloudflare edge network.

## Technology Stack

- **Frontend:**
  - [React](https://react.dev/)
  - [Vite](https://vitejs.dev/)
  - [TypeScript](https://www.typescriptlang.org/)
  - [Tailwind CSS](https://tailwindcss.com/)
  - [shadcn/ui](https://ui.shadcn.com/)
  - [Framer Motion](https://www.framer.com/motion/)
  - [Recharts](https://recharts.org/)
  - [Lucide React](https://lucide.dev/)
  - [React Webcam](https://www.npmjs.com/package/react-webcam)
- **Backend:**
  - [Cloudflare Workers](https://workers.cloudflare.com/)
  - [Hono](https://hono.dev/)
- **Data Persistence:**
  - [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- **AI:**
  - [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/)

## Getting Started

Follow these instructions to get the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Bun](https://bun.sh/) package manager

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/focal-finance-tracker.git
    cd focal-finance-tracker
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Configure Environment Variables:**
    Create a `.dev.vars` file in the root of the project for local development. This file is used by Wrangler to load environment variables.

    ```ini
    # .dev.vars
    CF_AI_BASE_URL="https://gateway.ai.cloudflare.com/v1/YOUR_ACCOUNT_ID/YOUR_GATEWAY_ID/openai"
    CF_AI_API_KEY="your-cloudflare-api-key"
    ```

    Replace the placeholder values with your actual Cloudflare AI Gateway details.

### Running in Development Mode

To start the development server for both the frontend and the worker, run:

```bash
bun dev
```

This will start the Vite development server on `http://localhost:3000` and the Cloudflare Worker on a separate port, with requests automatically proxied.

## Deployment

This project is designed for easy deployment to Cloudflare Pages.

1.  **Login to Wrangler:**
    ```bash
    bun wrangler login
    ```

2.  **Deploy the application:**
    ```bash
    bun deploy
    ```
    This command will build the Vite application and deploy it along with the Cloudflare Worker.

3.  **Configure Production Secrets:**
    After deployment, you must add your AI Gateway API key as a secret in the Cloudflare dashboard.

    ```bash
    bun wrangler secret put CF_AI_API_KEY
    ```

    You will also need to set the `CF_AI_BASE_URL` variable in your project's settings on the Cloudflare dashboard.

Alternatively, you can deploy directly from your GitHub repository.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Creative-Geek/Focal)

### Important Note on AI Features

This project utilizes Cloudflare's AI Gateway for its receipt scanning capabilities. For the AI features to function after deployment, you **must** configure your own `CF_AI_BASE_URL` and `CF_AI_API_KEY` in your Cloudflare project's settings. The provided template does not include working API keys for security reasons.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.