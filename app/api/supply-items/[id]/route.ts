import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = (await req.json()) as {
    unit?: string;
    gramsPerUnit?: number;
    pricePerUnit?: number;
    stockVenue?: number;
    stockEcommerce?: number;
  };

  const data: Record<string, unknown> = {};
  if (body.unit !== undefined) data.unit = body.unit;
  if (body.gramsPerUnit !== undefined) data.gramsPerUnit = body.gramsPerUnit;
  if (body.pricePerUnit !== undefined) data.pricePerUnit = body.pricePerUnit;
  if (body.stockVenue !== undefined) data.stockVenue = body.stockVenue;
  if (body.stockEcommerce !== undefined) data.stockEcommerce = body.stockEcommerce;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const item = await prisma.supplyItem.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(item);
}
