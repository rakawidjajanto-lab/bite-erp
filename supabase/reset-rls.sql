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

-- supply_items: raw ingredient/material stock for R&D (idempotent)
CREATE TABLE IF NOT EXISTS "supply_items" (
  "id"           TEXT          NOT NULL,
  "name"         TEXT          NOT NULL,
  "unit"         TEXT          NOT NULL,
  "gramsPerUnit" DECIMAL(10,4) NOT NULL DEFAULT 1,
  "stock"        DECIMAL(10,4) NOT NULL DEFAULT 0,
  "pricePerUnit" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supply_items_pkey" PRIMARY KEY ("id")
);

-- rnd_materials: materials consumed by an R&D project (idempotent)
CREATE TABLE IF NOT EXISTS "rnd_materials" (
  "id"            TEXT          NOT NULL,
  "projectId"     TEXT          NOT NULL,
  "supplyItemId"  TEXT          NOT NULL,
  "quantityUsed"  DECIMAL(10,4) NOT NULL,
  "valuationCost" DECIMAL(15,2) NOT NULL,
  "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rnd_materials_pkey"    PRIMARY KEY ("id"),
  CONSTRAINT "rnd_materials_proj_fk" FOREIGN KEY ("projectId")    REFERENCES "rnd_projects"("id")  ON DELETE CASCADE,
  CONSTRAINT "rnd_materials_item_fk" FOREIGN KEY ("supplyItemId") REFERENCES "supply_items"("id")
);

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
ALTER TABLE "supply_items"                DISABLE ROW LEVEL SECURITY;
ALTER TABLE "rnd_materials"               DISABLE ROW LEVEL SECURITY;
