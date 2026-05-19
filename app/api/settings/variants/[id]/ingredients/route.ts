import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, quantity, unit, pricePerUnit } = await req.json();

  if (!name?.trim() || !unit?.trim() || quantity <= 0 || pricePerUnit < 0) {
    return NextResponse.json({ error: "name, quantity, unit and pricePerUnit are required" }, { status: 400 });
  }

  const ingredient = await prisma.productVariantIngredient.create({
    data: {
      variantId: id,
      name: name.trim(),
      quantity,
      unit: unit.trim(),
      pricePerUnit,
    },
  });

  return NextResponse.json(ingredient, { status: 201 });
}
