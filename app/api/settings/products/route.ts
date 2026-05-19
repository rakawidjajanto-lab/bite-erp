import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      flavors: { where: { isActive: true } },
      variants: {
        where: { isActive: true },
        select: {
          id: true,
          flavorId: true,
          sellingPrice: true,
          ingredients: { select: { quantity: true, pricePerUnit: true } },
        },
      },
    },
  });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const body = await req.json();
  const product = await prisma.product.create({ data: body });
  return NextResponse.json(product, { status: 201 });
}
