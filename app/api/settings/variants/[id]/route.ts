import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.sellingPrice !== undefined) data.sellingPrice = body.sellingPrice;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const variant = await prisma.productVariant.update({
    where: { id: params.id },
    data,
    include: {
      product: { select: { id: true, name: true } },
      flavor: { select: { id: true, name: true } },
      ingredients: true,
    },
  });

  return NextResponse.json(variant);
}
