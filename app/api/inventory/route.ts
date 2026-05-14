import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.updatedAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }

  const inventory = await prisma.inventory.findMany({
    where,
    include: {
      product: { select: { name: true } },
      flavor: { select: { name: true, colorHex: true } },
    },
    orderBy: { quantity: "asc" },
  });
  return NextResponse.json(inventory);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { productId, flavorId, quantityChange, movementType, notes } = body;

  const inv = await prisma.inventory.upsert({
    where: { productId_flavorId: { productId, flavorId: flavorId ?? null } },
    update: { quantity: { increment: quantityChange } },
    create: { productId, flavorId, quantity: Math.max(0, quantityChange) },
  });

  await prisma.inventoryMovement.create({
    data: { productId, flavorId, movementType, quantityChange, notes },
  });

  return NextResponse.json(inv);
}
