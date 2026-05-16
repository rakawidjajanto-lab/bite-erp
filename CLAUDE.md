# BITE ERP — Rules for Claude

## DATABASE SAFETY — READ THIS FIRST

**Incident (2026-05-16):** Running `prisma db push` wiped all rows in `product_variant_ingredients`. Root cause: the `prisma/migrations/` folder is empty (no migration baseline), so when Prisma saw schema drift it dropped and recreated the table to reconcile it.

### Absolute rules — never break these

1. **Never run `prisma db push`.** It can drop and recreate tables when it cannot apply a change incrementally. The script has been renamed `db:push:UNSAFE_NEVER_USE_IN_PROD` to make this visible.

2. **Never run `prisma migrate dev`, `prisma migrate reset`, or any command that resets the database.**

3. **Never run `prisma db push --force-reset` or `prisma db push --accept-data-loss`.**

4. **The only safe Prisma command is `prisma generate`.** It only regenerates TypeScript types from `schema.prisma` — it never touches the database.

### How to apply schema changes (the only safe workflow)

All database changes must be written as raw SQL and run manually in the **Supabase SQL Editor**. Every statement must be written defensively:

```sql
-- New table
CREATE TABLE IF NOT EXISTS "table_name" (
  id TEXT PRIMARY KEY,
  ...
);

-- New column
ALTER TABLE "table_name"
  ADD COLUMN IF NOT EXISTS "columnName" TEXT;

-- New index
CREATE INDEX IF NOT EXISTS idx_name ON "table_name"("columnName");

-- Drop column (only if intentional, with explicit confirmation from user)
ALTER TABLE "table_name" DROP COLUMN IF EXISTS "columnName";
```

**Never use `DROP TABLE`, `TRUNCATE`, or bare `ALTER TABLE ... DROP COLUMN` without `IF EXISTS`.**

### Workflow for any schema change

1. Edit `prisma/schema.prisma` (defines TypeScript types only)
2. Run `npx prisma generate` (updates client types, no DB contact)
3. Write the equivalent `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` SQL
4. Show the SQL to the user and ask them to run it in the Supabase SQL Editor
5. Never run `prisma db push`

### Why prisma db push is dangerous here

The `prisma/migrations/` directory is empty — there is no migration history. Without a baseline, `prisma db push` has no way to know which changes are safe to apply incrementally. When it encounters drift (a column or relation that exists in `schema.prisma` but not in the DB, or vice versa), it drops and recreates the affected table. All rows are lost.

---

## General coding rules

- This is a Next.js 16 App Router project with Prisma ORM and Supabase (PostgreSQL).
- Auth uses `proxy.ts` (not `middleware.ts`) — Next.js 16 renamed the convention.
- `@supabase/ssr` v0.3.0 is installed — use `get`/`set`/`remove` cookie API, not `getAll`/`setAll`.
- All monetary values are stored as `Decimal` in Postgres; format for display with `formatIDR()` from `lib/formatters/currency.ts`.
- Date filters append `T23:59:59.999Z` to the `to` parameter to make end-of-day inclusive.
