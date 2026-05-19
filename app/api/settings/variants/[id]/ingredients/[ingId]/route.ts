import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; ingId: string }> }) {
  const { id, ingId } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.quantity !== undefined) data.quantity = body.quantity;
  if (body.unit !== undefined) data.unit = body.unit;

  if (body.pricePerUnit !== undefined) {
    const current = await prisma.productVariantIngredient.findUnique({
      where: { id: ingId },
      select: { name: true, pricePerUnit: true },
    });
    if (current && Number(current.pricePerUnit) !== Number(body.pricePerUnit)) {
      await prisma.ingredientPriceHistory.create({
        data: {
          ingredientId: ingId,
          ingredientName: (body.name as string | undefined) ?? current.name,
          variantId: id,
          oldPrice: current.pricePerUnit,
          newPrice: body.pricePerUnit,
        },
      });
    }
    data.pricePerUnit = body.pricePerUnit;
  }

  const ingredient = await prisma.productVariantIngredient.update({
    where: { id: ingId },
    data,
  });

  return NextResponse.json(ingredient);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; ingId: string }> }) {
  const { ingId } = await params;
  await prisma.productVariantIngredient.delete({ where: { id: ingId } });
  return NextResponse.json({ ok: true });
}
