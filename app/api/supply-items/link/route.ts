import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const txs = await prisma.transaction.findMany({
    where: { category: "SUPPLIES", inventoryLinks: { none: {} } },
    orderBy: { date: "desc" },
    select: { id: true, date: true, description: true, amountOut: true },
  });
  return NextResponse.json(txs);
}

export async function POST(req: Request) {
  const {
    transactionId,
    supplyItemId,
    name,
    unit,
    gramsPerUnit,
    quantity,
    location,
    pricePerUnit,
  } = await req.json() as {
    transactionId: string;
    supplyItemId?: string;
    name?: string;
    unit?: string;
    gramsPerUnit?: number;
    quantity: number;
    location: "VENUE" | "ECOMMERCE";
    pricePerUnit?: number;
  };

  if (!transactionId) return NextResponse.json({ error: "transactionId required" }, { status: 400 });
  if (!quantity || quantity <= 0) return NextResponse.json({ error: "quantity must be positive" }, { status: 400 });
  if (!location) return NextResponse.json({ error: "location required" }, { status: 400 });

  // Resolve or create the supply item
  let itemId = supplyItemId;
  if (!itemId) {
    if (!name?.trim() || !unit?.trim()) {
      return NextResponse.json({ error: "name and unit required when supplyItemId is not provided" }, { status: 400 });
    }
    const existing = await prisma.supplyItem.findFirst({
      where: { name: { equals: name.trim(), mode: "insensitive" } },
    });
    if (existing) {
      itemId = existing.id;
    } else {
      const created = await prisma.supplyItem.create({
        data: {
          name: name.trim(),
          unit: unit.trim(),
          gramsPerUnit: gramsPerUnit ?? 1,
          stockVenue: 0,
          stockEcommerce: 0,
          pricePerUnit: pricePerUnit ?? 0,
        },
      });
      itemId = created.id;
    }
  }

  // Update stock and price
  const stockField = location === "VENUE" ? "stockVenue" : "stockEcommerce";
  const updateData: Record<string, unknown> = { [stockField]: { increment: quantity } };
  if (pricePerUnit !== undefined && pricePerUnit > 0) updateData.pricePerUnit = pricePerUnit;
  if (gramsPerUnit !== undefined && gramsPerUnit > 0) updateData.gramsPerUnit = gramsPerUnit;

  const [item] = await Promise.all([
    prisma.supplyItem.update({
      where: { id: itemId },
      data: updateData,
    }),
    prisma.inventoryTransactionLink.create({
      data: {
        supplyItemId: itemId,
        transactionId,
        quantityAdded: quantity,
        location,
      },
    }),
  ]);

  return NextResponse.json(item, { status: 201 });
}
