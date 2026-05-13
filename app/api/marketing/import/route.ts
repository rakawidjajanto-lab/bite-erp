import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type GiveawayRow = {
  date: string;
  recipient: string;
  purpose: string;
  productName: string;
  quantity: number;
  notes: string;
};

export async function POST(req: Request) {
  const { rows } = (await req.json()) as { rows: GiveawayRow[] };

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.recipient || !row.productName) { skipped++; continue; }

    const product = await prisma.product.findFirst({
      where: { name: { equals: row.productName, mode: "insensitive" } },
      select: { id: true, unitCost: true },
    });

    if (!product) { failed++; continue; }

    try {
      const giveaway = await prisma.marketingGiveaway.create({
        data: {
          date: new Date(row.date),
          recipient: row.recipient,
          purpose: (row.purpose || "OTHER") as "ENDORSEMENT" | "SAMPLING" | "EVENT" | "OTHER",
          notes: row.notes || null,
          items: {
            create: [{
              productId: product.id,
              flavorId: null,
              quantity: row.quantity,
              unitCost: product.unitCost,
            }],
          },
        },
      });

      await prisma.inventory.upsert({
        where: { productId_flavorId: { productId: product.id, flavorId: null } },
        update: { quantity: { decrement: row.quantity } },
        create: { productId: product.id, flavorId: null, quantity: -row.quantity },
      });

      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          flavorId: null,
          movementType: "MARKETING_GIVEAWAY",
          quantityChange: -row.quantity,
          referenceId: giveaway.id,
          notes: `Marketing import: ${row.recipient}`,
        },
      });

      imported++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ imported, skipped, failed });
}
