import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const venueId = searchParams.get("venueId");
  const days = parseInt(searchParams.get("days") ?? "30");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const sales = await prisma.padelSale.findMany({
    where: {
      ...(venueId ? { venueId } : {}),
      saleDate: { gte: startDate },
    },
    include: { flavor: true, venue: true },
    orderBy: { saleDate: "desc" },
  });

  return NextResponse.json(sales);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { venueId, saleDate, sales, notes } = body;

  const created = await prisma.$transaction(
    sales.map((s: { flavorId: string; quantitySold: number; unitPrice: number }) =>
      prisma.padelSale.create({
        data: {
          venueId,
          saleDate: new Date(saleDate),
          flavorId: s.flavorId,
          quantitySold: s.quantitySold,
          unitPrice: s.unitPrice,
          totalAmount: s.quantitySold * s.unitPrice,
          notes,
        },
      })
    )
  );

  await prisma.transaction.create({
    data: {
      date: new Date(saleDate),
      description: `Padel venue sales — ${sales.length} flavor(s)`,
      category: "SALES",
      amountIn: sales.reduce(
        (sum: number, s: { quantitySold: number; unitPrice: number }) =>
          sum + s.quantitySold * s.unitPrice,
        0
      ),
      source: "PADEL",
    },
  });

  return NextResponse.json(created, { status: 201 });
}
