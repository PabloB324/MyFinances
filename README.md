# MyFinances Web

Personal finance web app migrated from a native iOS/Swift app. Track income, expenses, budgets, savings goals and scheduled payments — all from the browser, mobile-first.

## Features

| Module | Description |
|---|---|
| **Dashboard** | Total balance, monthly income/expense breakdown, financial score (0–100), active goals, upcoming payments, last transactions |
| **Historial** | Month-by-month transaction list with daily bar chart, search, and inline edit/delete |
| **Resumen** | Read-only monthly summary — balance card, income/expense cards, expenses-by-category chart |
| **Presupuestos** | Monthly budgets per category with progress bars and spending alerts |
| **Metas** | Savings goals with contribution tracking, progress %, days remaining, and feasibility analysis |
| **Pagos** | Scheduled payments grouped by overdue / upcoming / this month / paid. Supports recurring payments with auto-generation of the next occurrence on mark-as-paid |
| **Grupo** | Shared group wallet — create or join a group by code, view per-member breakdown and group transaction history |
| **Perfil** | Avatar upload, account stats, category management, sign out |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Charts | Recharts |
| Testing | Vitest + React Testing Library |
| Deployment | Vercel |

## Architecture

```
app/
├── (app)/                      # Authenticated shell (AuthGuard + tab bar)
│   ├── layout.tsx              # AuthGuard · DataProvider · GroupProvider · TabBar
│   ├── dashboard/page.tsx      # Main dashboard
│   ├── historial/page.tsx      # Transaction history
│   ├── resumen/page.tsx        # Monthly summary
│   ├── presupuestos/page.tsx   # Budgets
│   ├── metas/page.tsx          # Savings goals
│   ├── pagos/page.tsx          # Scheduled payments
│   ├── grupo/page.tsx          # Group wallet
│   ├── perfil/page.tsx         # User profile
│   └── categorias/page.tsx     # Category management
├── login/page.tsx
├── register/page.tsx
├── client-root.tsx             # Dynamic AuthProvider (ssr: false) — prevents Supabase init during SSR
├── layout.tsx                  # Root layout (Server Component)
└── globals.css                 # Tailwind @theme — color tokens, modal utilities

context/
├── auth-context.tsx            # Supabase Auth — AppUser, signIn, register, signOut, saveProfilePhoto
├── data-context.tsx            # All CRUD — transactions, categories, budgets, goals, contributions, payments
└── group-context.tsx           # Group state — create, join, leave, group transactions + Realtime

lib/
├── supabase.ts                 # Supabase client (anon key, browser-side)
├── utils.ts                    # formatCurrency (COP), dates, filterTransactionsByMonth, totalByType, clamp…
├── constants.ts                # DEFAULT_CATEGORIES, SCORE_WEIGHTS, FREQUENCY_DAYS, icons, colors
├── calculations/
│   ├── financial-score.ts      # Score 0–100 across 4 components: savings, payments, goals, activity
│   ├── goals.ts                # goalProgress, goalDaysRemaining, goalRequiredQuota, goalFeasibility
│   └── payments.ts             # groupPaymentsByStatus, dashboardPayments, monthlyPaymentsTotal

components/
└── transactions/
    └── transaction-modal.tsx   # Full-screen add/edit transaction modal

types/
└── models.ts                   # Transaction, Category, Budget, SavingsGoal, ScheduledPayment, GroupInfo…

__tests__/
└── lib/
    ├── utils.test.ts           # 29 tests — formatCurrency, dates, filters, totals, clamp, generateGroupCode
    └── calculations.test.ts    # 31 tests — financial score, goal calculations, payment grouping
```

## Design Decisions

**SSR-safe Supabase initialization** — Supabase Auth reads `localStorage` on init, which throws during Next.js static generation. The `client-root.tsx` Client Component uses `dynamic(() => import('./auth-context'), { ssr: false })` to defer initialization to the browser. The root `layout.tsx` stays a Server Component.

**Row Level Security** — All Supabase tables have RLS enabled. Every query is automatically scoped to the authenticated user's `user_id`. No server-side enforcement code needed beyond the policies.

**snake_case → camelCase at the boundary** — Supabase returns snake_case column names. Each table has a `*FromRow()` converter in `data-context.tsx` that maps to typed TypeScript models. The rest of the app only sees camelCase.

**Timezone-safe date storage** — Date-only columns (budget `month_start`, goal `deadline`, payment `due_date`) are stored as `YYYY-MM-DD` using local time, not `toISOString()` which gives UTC. On read, dates are parsed with `+ 'T12:00:00'` to avoid UTC-to-local shifts that would move dates to the previous day in UTC-5 (Colombia).

**Mobile-first, desktop-capable** — Tab bar fixed at the bottom, main content scrollable above it. All modals use `z-index: 60` to appear above the tab bar (`z-index: 40`). Works as a PWA from any mobile browser.

**Financial Score** — Composite 0–100 score with four weighted components:

| Component | Weight | Logic |
|---|---|---|
| Savings rate | 35 | `(income - expense) / income` for the current month |
| Payment discipline | 30 | Ratio of non-overdue payments in last 30 days |
| Goal progress | 20 | Average progress across active savings goals |
| Activity | 15 | Transaction frequency vs. expected daily rate |

## Database Schema

```
profiles            — id (→ auth.users), display_name, photo_url, group_id
categories          — user_id, name, icon, color_name, type (Ingreso|Gasto)
transactions        — user_id, title, amount, date, type, category_id, notes
budgets             — user_id, category_id, limit_amount, month_start (unique per user+category+month)
savings_goals       — user_id, name, icon, target_amount, saved_amount, deadline, frequency
savings_contributions — user_id, goal_id, amount, date
scheduled_payments  — user_id, name, icon, amount, due_date, is_recurring, recurrence, reminder, is_paid…
groups              — name, code (6-char unique), created_by
group_members       — group_id, user_id, display_name, photo_url
group_transactions  — group_id, title, amount, date, type, category_id, created_by_uid, created_by_name
```

Trigger `on_auth_user_created` auto-inserts a row in `profiles` on every new sign-up.  
Default categories are seeded client-side on first login if the user has none.

## Running Locally

**Requirements:** Node.js ≥ 20 (use `nvm use v20`)

```bash
cp .env.example .env.local
# Fill in your Supabase URL and keys
npm install
npm run dev        # http://localhost:3000
npm test           # 60 tests
npm run build      # production build
```

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Public anon key — safe to expose, RLS enforces access |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service role key — never use `NEXT_PUBLIC_` prefix |

## License

MIT
