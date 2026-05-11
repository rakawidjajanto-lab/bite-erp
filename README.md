# BITE ERP

Financial management system for BITE Protein Gelato — built with Next.js 14, Supabase, and Prisma.

## IMPORTANT: Before running for the first time

**Delete the `app/(dashboard)/` folder.** It was used during scaffolding and conflicts with the real pages in `app/dashboard/`. In Finder or your terminal:

```bash
rm -rf app/\(dashboard\)/
```

Or right-click → Delete the `(dashboard)` folder inside `app/` in Cursor's file tree.

---

## Setup (one-time)

### 1. Install Node.js
Download and install from [nodejs.org](https://nodejs.org) (LTS version).

### 2. Install dependencies
Open this folder in a terminal, then run:
```bash
npm install
```

### 3. Create a Supabase project
1. Go to [supabase.com](https://supabase.com) → New project
2. Copy your project URL and keys from **Settings → API**

### 4. Configure environment variables
Edit `.env.local` and replace the placeholder values with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxx:password@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
CRON_SECRET=any-random-string-you-choose
```

### 5. Push the database schema
```bash
npm run db:push
```

### 6. Start the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## First steps after setup

1. **Sign up** — Go to your Supabase dashboard → Authentication → Users → Add user, then log in with those credentials
2. **Add your product** — Go to Settings → Products → Add "Protein Gelato" with your unit cost and selling price
3. **Add flavors** — Settings → Flavors → Add each flavor (Vanilla, Chocolate, Matcha, etc.) with colors
4. **Add your padel venue** — Settings → Venues → Add the padel court name
5. **Import existing data** — Transactions → Import Excel → Upload your BITE Financials Tracker file

---

## Daily workflow

| Task | Where |
|---|---|
| Log a sale (cash) | Transactions → + Add Transaction |
| Log an expense | Transactions → + Add Transaction |
| Log padel venue sales | Padel Venue → Log Sales |
| Record restock to venue | Padel Venue → Log Delivery |
| Import Tokopedia sales | Platforms → Import CSV |
| Import Shopee sales | Platforms → Import CSV |
| Check flavor stock recommendations | Padel Venue → Flavor Recs |
| View P&L | Finance → P&L Report |
| View projections | Finance → Projections |
| Log R&D expense | R&D → [select project] → Log Expense |

---

## Deployment (Vercel)

1. Push this folder to a GitHub repo
2. Import the repo on [vercel.com](https://vercel.com)
3. Add all `.env.local` variables to Vercel's Environment Variables settings
4. Deploy — the cron job (`/api/cron/recalculate-projections`) runs nightly automatically
