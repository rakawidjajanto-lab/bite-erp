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
  const { date, recipient, purpose, notes, items } = body as {
    date: string;
    recipient: string;
    purpose: string;
    notes?: string;
    items: GiveawayItem[];
  };

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    select: { id: true, unitCost: true },
  });
  const costMap = Object.fromEntries(products.map((p) => [p.id, p.unitCost]));

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
          unitCost: costMap[item.productId] ?? 0,
        })),
      },
    },
    include: { items: true },
  });

  await Promise.all(
    items.map(async (item) => {
      await prisma.inventory.upsert({
        where: { productId_flavorId: { productId: item.productId, flavorId: item.flavorId ?? null } },
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

  return NextResponse.json(giveaway, { status: 201 });
}
