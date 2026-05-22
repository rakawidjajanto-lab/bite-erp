-- Permanently disable RLS on all tables.
-- Run on every deploy via `node scripts/apply-rls.js`.
-- Idempotent: safe to run repeatedly.

-- Grant BYPASSRLS to postgres so even if Supabase re-enables RLS on any table,
-- Prisma's postgres connection will always bypass it.
ALTER ROLE postgres BYPASSRLS;

-- Add discount columns to customer_orders (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DiscountType') THEN
    CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');
  END IF;
END $$;

ALTER TABLE "customer_orders"
  ADD COLUMN IF NOT EXISTS "discountType"  "DiscountType" NOT NULL DEFAULT 'FIXED',
  ADD COLUMN IF NOT EXISTS "discountValue" DECIMAL(15,2)  NOT NULL DEFAULT 0;

-- Drop any existing allow_all policies (cleanup from previous approach)
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS allow_all ON %I', t);
  END LOOP;
END $$;

-- Disable RLS on every table
ALTER TABLE "transactions"                DISABLE ROW LEVEL SECURITY;
ALTER TABLE "platforms"                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE "platform_orders"             DISABLE ROW LEVEL SECURITY;
ALTER TABLE "platform_order_items"        DISABLE ROW LEVEL SECURITY;
ALTER TABLE "products"                    DISABLE ROW LEVEL SECURITY;
ALTER TABLE "flavors"                     DISABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory"                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_movements"         DISABLE ROW LEVEL SECURITY;
ALTER TABLE "padel_venues"                DISABLE ROW LEVEL SECURITY;
ALTER TABLE "padel_deliveries"            DISABLE ROW LEVEL SECURITY;
ALTER TABLE "padel_delivery_items"        DISABLE ROW LEVEL SECURITY;
ALTER TABLE "padel_sales"                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE "rnd_projects"                DISABLE ROW LEVEL SECURITY;
ALTER TABLE "rnd_expenses"                DISABLE ROW LEVEL SECURITY;
ALTER TABLE "supplies"                    DISABLE ROW LEVEL SECURITY;
ALTER TABLE "supply_purchases"            DISABLE ROW LEVEL SECURITY;
ALTER TABLE "financial_projections"       DISABLE ROW LEVEL SECURITY;
ALTER TABLE "import_logs"                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE "marketing_giveaways"         DISABLE ROW LEVEL SECURITY;
ALTER TABLE "marketing_giveaway_items"    DISABLE ROW LEVEL SECURITY;
ALTER TABLE "physical_assets"             DISABLE ROW LEVEL SECURITY;
ALTER TABLE "rnd_inventory_usages"        DISABLE ROW LEVEL SECURITY;
ALTER TABLE "product_variants"            DISABLE ROW LEVEL SECURITY;
ALTER TABLE "product_variant_ingredients" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ingredient_price_history"    DISABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_orders"             DISABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_order_items"        DISABLE ROW LEVEL SECURITY;
