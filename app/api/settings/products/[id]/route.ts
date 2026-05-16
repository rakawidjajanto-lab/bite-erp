import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  console.log("[DELETE product] start, productId:", id);

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Fetch variants + ingredient IDs
      const variants = await tx.productVariant.findMany({
        where: { productId: id },
        select: { id: true, ingredients: { select: { id: true } } },
      });
      const variantIds = variants.map((v) => v.id);
      const ingredientIds = variants.flatMap((v) => v.ingredients.map((i) => i.id));
      console.log("[DELETE product] variantIds:", variantIds, "ingredientIds:", ingredientIds);

      // 2. Fetch flavor IDs for this product
      const flavors = await tx.flavor.findMany({ where: { productId: id }, select: { id: true } });
      const flavorIds = flavors.map((f) => f.id);
      console.log("[DELETE product] flavorIds:", flavorIds);

      // 3. ingredient_price_history (may not exist yet — skip gracefully)
      if (ingredientIds.length) {
        try {
          const phResult = await tx.ingredientPriceHistory.deleteMany({
            where: { ingredientId: { in: ingredientIds } },
          });
          console.log("[DELETE product] deleted ingredientPriceHistory rows:", phResult.count);
        } catch (e) {
          console.warn("[DELETE product] ingredientPriceHistory skip (table may not exist):", (e as Error).message);
        }
      }

      // 4. product_variant_ingredients
      if (ingredientIds.length) {
        const r = await tx.productVariantIngredient.deleteMany({ where: { id: { in: ingredientIds } } });
        console.log("[DELETE product] deleted productVariantIngredient rows:", r.count);
      }

      // 5. customer_order_items (reference variants)
      if (variantIds.length) {
        const r = await tx.customerOrderItem.deleteMany({ where: { variantId: { in: variantIds } } });
        console.log("[DELETE product] deleted customerOrderItem rows:", r.count);
      }

      // 6. product_variants
      if (variantIds.length) {
        const r = await tx.productVariant.deleteMany({ where: { productId: id } });
        console.log("[DELETE product] deleted productVariant rows:", r.count);
      }

      // 7. padel_sales (required FK on flavorId — no cascade)
      if (flavorIds.length) {
        const r = await tx.padelSale.deleteMany({ where: { flavorId: { in: flavorIds } } });
        console.log("[DELETE product] deleted padelSale rows:", r.count);
      }

      // 8. padel_delivery_items (required FK on flavorId — no cascade)
      if (flavorIds.length) {
        const r = await tx.padelDeliveryItem.deleteMany({ where: { flavorId: { in: flavorIds } } });
        console.log("[DELETE product] deleted padelDeliveryItem rows:", r.count);
      }

      // 9. inventory_movements
      const r9 = await tx.inventoryMovement.deleteMany({ where: { productId: id } });
      console.log("[DELETE product] deleted inventoryMovement rows:", r9.count);

      // 10. inventory
      const r10 = await tx.inventory.deleteMany({ where: { productId: id } });
      console.log("[DELETE product] deleted inventory rows:", r10.count);

      // 11. marketing_giveaway_items
      const r11 = await tx.marketingGiveawayItem.deleteMany({ where: { productId: id } });
      console.log("[DELETE product] deleted marketingGiveawayItem rows:", r11.count);

      // 12. rnd_inventory_usages
      const r12 = await tx.rndInventoryUsage.deleteMany({ where: { productId: id } });
      console.log("[DELETE product] deleted rndInventoryUsage rows:", r12.count);

      // 13. flavors
      if (flavorIds.length) {
        const r = await tx.flavor.deleteMany({ where: { productId: id } });
        console.log("[DELETE product] deleted flavor rows:", r.count);
      }

      // 14. product
      await tx.product.delete({ where: { id } });
      console.log("[DELETE product] deleted product", id);
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE product] FAILED:", error);
    return NextResponse.json(
      { error: (error as Error).message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
