import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const items = await prisma.supplyItem.findMany({ orderBy: { name: "asc" } });
    console.log("[supply-items GET] row count:", items.length, "first 3:", JSON.stringify(items.slice(0, 3)));
    return NextResponse.json(items);
  } catch (err) {
    console.error("[supply-items GET] ERROR:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { name, unit, gramsPerUnit, stockVenue, stockEcommerce, pricePerUnit } = await req.json() as {
    name: string;
    unit: string;
    gramsPerUnit?: number;
    stockVenue?: number;
    stockEcommerce?: number;
    pricePerUnit?: number;
  };

  if (!name?.trim() || !unit?.trim()) {
    return NextResponse.json({ error: "name and unit are required" }, { status: 400 });
  }

  const item = await prisma.supplyItem.create({
    data: {
      name: name.trim(),
      unit: unit.trim(),
      gramsPerUnit: gramsPerUnit ?? 1,
      stockVenue: stockVenue ?? 0,
      stockEcommerce: stockEcommerce ?? 0,
      pricePerUnit: pricePerUnit ?? 0,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
