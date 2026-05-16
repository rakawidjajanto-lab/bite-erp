import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string; ingId: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.quantity !== undefined) data.quantity = body.quantity;
  if (body.unit !== undefined) data.unit = body.unit;

  if (body.pricePerUnit !== undefined) {
    const current = await prisma.productVariantIngredient.findUnique({
      where: { id: params.ingId },
      select: { name: true, pricePerUnit: true },
    });
    if (current && Number(current.pricePerUnit) !== Number(body.pricePerUnit)) {
      await prisma.ingredientPriceHistory.create({
        data: {
          ingredientId: params.ingId,
          ingredientName: (body.name as string | undefined) ?? current.name,
          variantId: params.id,
          oldPrice: current.pricePerUnit,
          newPrice: body.pricePerUnit,
        },
      });
    }
    data.pricePerUnit = body.pricePerUnit;
  }

  const ingredient = await prisma.productVariantIngredient.update({
    where: { id: params.ingId },
    data,
  });

  return NextResponse.json(ingredient);
}

export async function DELETE(_req: Request, { params }: { params: { id: string; ingId: string } }) {
  await prisma.productVariantIngredient.delete({ where: { id: params.ingId } });
  return NextResponse.json({ ok: true });
}
