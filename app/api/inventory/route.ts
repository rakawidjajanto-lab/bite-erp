import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const inventory = await prisma.inventory.findMany({
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
