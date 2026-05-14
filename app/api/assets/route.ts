import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.purchaseDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const assets = await prisma.physicalAsset.findMany({
    where,
    orderBy: { purchaseDate: "desc" },
  });
  return NextResponse.json(assets);
}

export async function POST(req: Request) {
  const { name, category, purchaseDate, purchasePrice, currentValue, notes } = await req.json();

  const asset = await prisma.physicalAsset.create({
    data: {
      name,
      category,
      purchaseDate: new Date(purchaseDate),
      purchasePrice,
      currentValue,
      notes: notes || null,
    },
  });

  return NextResponse.json(asset, { status: 201 });
}
