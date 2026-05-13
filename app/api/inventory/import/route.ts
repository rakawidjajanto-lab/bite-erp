import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type InventoryRow = {
  productName: string;
  quantity: number;
  unit?: string;
  notes?: string;
};

export async function POST(req: Request) {
  const { rows } = (await req.json()) as { rows: InventoryRow[] };

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.productName || row.quantity <= 0) { skipped++; continue; }

    const product = await prisma.product.findFirst({
      where: { name: { equals: row.productName, mode: "insensitive" } },
      select: { id: true },
    });

    if (!product) { failed++; continue; }

    try {
      const existing = await prisma.inventory.findFirst({
        where: { productId: product.id, flavorId: null },
      });

      if (existing) {
        await prisma.inventory.update({
          where: { id: existing.id },
          data: {
            quantity: { increment: row.quantity },
            ...(row.unit ? { unit: row.unit } : {}),
          },
        });
      } else {
        await prisma.inventory.create({
          data: {
            productId: product.id,
            flavorId: null,
            quantity: row.quantity,
            unit: row.unit || "pcs",
          },
        });
      }

      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          flavorId: null,
          movementType: "RESTOCK",
          quantityChange: row.quantity,
          notes: row.notes || `CSV import: ${row.productName}`,
        },
      });

      imported++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ imported, skipped, failed });
}
