import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const variants = await prisma.productVariant.findMany({
    where: { isActive: true },
    include: {
      product: { select: { id: true, name: true } },
      flavor: { select: { id: true, name: true } },
      ingredients: true,
    },
    orderBy: [{ product: { name: "asc" } }, { createdAt: "asc" }],
  });
  return NextResponse.json(variants);
}

export async function POST(req: Request) {
  const { productName, flavorName, size, sellingPrice } = await req.json();

  if (!productName?.trim() || !size?.trim() || !sellingPrice) {
    return NextResponse.json({ error: "productName, size and sellingPrice are required" }, { status: 400 });
  }

  let product = await prisma.product.findFirst({
    where: { name: { equals: productName.trim(), mode: "insensitive" } },
  });

  if (!product) {
    product = await prisma.product.create({
      data: {
        name: productName.trim(),
        sku: `AUTO-${Date.now()}`,
        unitCost: 0,
        sellingPrice: sellingPrice,
      },
    });
  }

  let flavorId: string | null = null;
  if (flavorName?.trim()) {
    let flavor = await prisma.flavor.findFirst({
      where: {
        productId: product.id,
        name: { equals: flavorName.trim(), mode: "insensitive" },
      },
    });
    if (!flavor) {
      flavor = await prisma.flavor.create({
        data: { name: flavorName.trim(), productId: product.id },
      });
    }
    flavorId = flavor.id;
  }

  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      flavorId,
      size: size.trim(),
      sellingPrice,
    },
    include: {
      product: { select: { id: true, name: true } },
      flavor: { select: { id: true, name: true } },
      ingredients: true,
    },
  });

  return NextResponse.json(variant, { status: 201 });
}
