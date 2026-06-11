import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const items = await prisma.supplyItem.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const { name, unit, gramsPerUnit, stock, pricePerUnit } = await req.json() as {
    name: string;
    unit: string;
    gramsPerUnit: number;
    stock: number;
    pricePerUnit: number;
  };

  if (!name?.trim() || !unit?.trim()) {
    return NextResponse.json({ error: "name and unit are required" }, { status: 400 });
  }

  const item = await prisma.supplyItem.create({
    data: {
      name: name.trim(),
      unit: unit.trim(),
      gramsPerUnit: gramsPerUnit ?? 1,
      stock: stock ?? 0,
      pricePerUnit: pricePerUnit ?? 0,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
