import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const venueId = searchParams.get("venueId");

  const deliveries = await prisma.padelDelivery.findMany({
    where: venueId ? { venueId } : {},
    include: { items: { include: { flavor: true } }, venue: true },
    orderBy: { deliveryDate: "desc" },
    take: 50,
  });

  return NextResponse.json(deliveries);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { venueId, deliveryDate, items, notes } = body;

  const totalItems = items.reduce(
    (sum: number, i: { quantity: number }) => sum + i.quantity,
    0
  );
  const totalCost = items.reduce(
    (sum: number, i: { quantity: number; unitCost: number }) =>
      sum + i.quantity * i.unitCost,
    0
  );

  const delivery = await prisma.padelDelivery.create({
    data: {
      venueId,
      deliveryDate: new Date(deliveryDate),
      notes,
      totalItems,
      items: {
        create: items.map((i: { flavorId: string; quantity: number; unitCost: number }) => ({
          flavorId: i.flavorId,
          quantity: i.quantity,
          unitCost: i.unitCost,
        })),
      },
    },
    include: { items: { include: { flavor: true } } },
  });

  await prisma.transaction.create({
    data: {
      date: new Date(deliveryDate),
      description: `Padel delivery — ${totalItems} items to venue`,
      category: "INVENTORY",
      amountOut: totalCost,
      source: "PADEL",
    },
  });

  return NextResponse.json(delivery, { status: 201 });
}
