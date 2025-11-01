💰 CoinCollab — Budget Tracker (React + Supabase)

A modern, mobile-first personal finance app that lets you track income/expenses, filter and search transactions, and visualize trends — all backed by Supabase (auth, Postgres, RLS). Deployed as a static site on GitHub Pages.

Fast SPA built with Vite + React + TypeScript

Supabase for auth & database (Postgres + Row Level Security)

Shadcn/UI + Tailwind for a clean, dark-mode friendly UI

TanStack Query for data fetching/caching

Recharts for simple insights/graphs

Client-side routing via HashRouter (GitHub Pages compatible)

🔗 Live demo: https://craiglawsonnn.github.io/coin-collab-hub/#/

📦 Repository: this repo

✨ Features

Transactions

Add, edit, delete, and filter by type, category, account, user

Quick search across description/category/account

Soft “optimistic” updates with rollback on error

Multi-view navigation

Main dashboard, transactions list, graphs, settings

Analytics

Net flow (income − expense) computed and displayed

Basic graphs with Recharts

Collaboration-ready

Owner-view support via ?owner=<user_id> in routes

Responsive UI

Works great on mobile; adaptive list layout for small screens

Robust UX

Toasts, loading states, and error handling throughout

🧱 Tech Stack

Frontend: React 18, TypeScript, Vite, Tailwind, shadcn/ui, Lucide Icons

State/Data: TanStack Query, React Hook Form, Zod

Charts: Recharts

Backend: Supabase (Auth, Postgres, RLS)

Deploy: GitHub Actions → GitHub Pages (HashRouter + base)

📸 Screens (add your images)

public/screenshot-dashboard.png – Dashboard

public/screenshot-transactions.png – Transactions

public/screenshot-graphs.png – Graphs

![Dashboard](public/screenshot-dashboard.png)
![Transactions](public/screenshot-transactions.png)
![Graphs](public/screenshot-graphs.png)

⚙️ Environment

Create .env (or .env.local) at the root:

VITE_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR-ANON-KEY"


In CI (GitHub Actions), set these as Repository Variables:
VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.

🛠️ Local Development
# install
npm ci

# run dev server
npm run dev
# http://localhost:8080 (see vite.config.ts server.port)

# type-check + lint (optional)
npm run lint

🚀 Production Build & Deploy

This project is configured for GitHub Pages:

vite.config.ts sets base: "/coin-collab-hub/"

App uses HashRouter so routes work on Pages

CI copies dist/index.html → dist/404.html for deep links

Workflow: .github/workflows/pages.yml

Manual build:

npm run build
# preview the prod build locally
npm run preview

🧭 Project Structure (high level)
src/
  components/        # UI & layout
  hooks/             # custom hooks (auth, etc.)
  integrations/
    supabase/        # supabase client/types
  pages/
    Index.tsx
    Auth.tsx
    Transactions.tsx
    Graphs.tsx
    Settings.tsx
  App.tsx            # routes
  main.tsx           # React root + HashRouter

🔒 Security & RLS

Data access is enforced via Supabase Row Level Security.

Client requests must respect authenticated user policies.

🗺️ Roadmap

Budgets & categories management

Recurring transactions

Export/Import (CSV)

More charts/insights (cash-flow, burn rate, category drill-downs)

🙌 Credits

UI components by shadcn/ui

Icons by lucide-react

Charts by Recharts

Backend by Supabase

📫 Feedback

Found a bug or have a feature request?
Open an issue or start a discussion — contributions welcome!