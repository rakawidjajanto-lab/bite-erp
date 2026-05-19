import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type GiveawayItem = { productId: string; flavorId?: string; quantity: number };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }

  const giveaways = await prisma.marketingGiveaway.findMany({
    where,
    include: {
      items: {
        include: {
          product: { select: { name: true } },
          flavor: { select: { name: true, colorHex: true } },
        },
      },
    },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(giveaways);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { date, recipient, purpose, notes, items, linkedTransactionId } = body as {
    date: string;
    recipient: string;
    purpose: string;
    notes?: string;
    items: GiveawayItem[];
    linkedTransactionId?: string;
  };

  const productIds = [...new Set(items.map((i) => i.productId))];
  const [products, variants] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, unitCost: true },
    }),
    prisma.productVariant.findMany({
      where: { productId: { in: productIds } },
      select: {
        productId: true,
        flavorId: true,
        sellingPrice: true,
        ingredients: { select: { quantity: true, pricePerUnit: true } },
      },
    }),
  ]);

  const fallbackCost = Object.fromEntries(products.map((p) => [p.id, Number(p.unitCost)]));

  function effectiveCost(productId: string, flavorId: string | undefined): number {
    const variant = variants.find(
      (v) => v.productId === productId && v.flavorId === (flavorId || null)
    );
    if (variant) {
      const cogs = variant.ingredients.reduce(
        (s, i) => s + Number(i.quantity) * Number(i.pricePerUnit),
        0
      );
      if (cogs > 0) return cogs;
      return Number(variant.sellingPrice);
    }
    return fallbackCost[productId] ?? 0;
  }

  const giveaway = await prisma.marketingGiveaway.create({
    data: {
      date: new Date(date),
      recipient,
      purpose: purpose as "ENDORSEMENT" | "SAMPLING" | "EVENT" | "OTHER",
      notes,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          flavorId: item.flavorId ?? null,
          quantity: item.quantity,
          unitCost: effectiveCost(item.productId, item.flavorId),
        })),
      },
    },
    include: { items: true },
  });

  await Promise.all(
    items.map(async (item) => {
      await prisma.inventory.upsert({
        where: { productId_flavorId: { productId: item.productId, flavorId: (item.flavorId ?? null) as string } },
        update: { quantity: { decrement: item.quantity } },
        create: { productId: item.productId, flavorId: item.flavorId ?? null, quantity: -item.quantity },
      });
      await prisma.inventoryMovement.create({
        data: {
          productId: item.productId,
          flavorId: item.flavorId ?? null,
          movementType: "MARKETING_GIVEAWAY",
          quantityChange: -item.quantity,
          referenceId: giveaway.id,
          notes: `Marketing: ${recipient} — ${purpose}`,
        },
      });
    })
  );

  if (linkedTransactionId) {
    // Stamp the giveaway id onto the existing transaction so it no longer appears as "unlinked".
    await prisma.transaction.update({
      where: { id: linkedTransactionId },
      data: { referenceId: giveaway.id },
    });
  } else {
    const totalCogs = items.reduce(
      (sum, item) => sum + item.quantity * effectiveCost(item.productId, item.flavorId || undefined),
      0
    );
    if (totalCogs > 0) {
      await prisma.transaction.create({
        data: {
          date: new Date(date),
          description: `Marketing Giveaway: ${recipient} (${purpose})`,
          category: "MARKETING",
          amountOut: totalCogs,
          source: "MANUAL",
          referenceId: giveaway.id,
        },
      });
    }
  }

  return NextResponse.json(giveaway, { status: 201 });
}
