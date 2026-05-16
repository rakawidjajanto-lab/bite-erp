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

type IngredientInput = { name: string; quantity: number; unit: string; pricePerUnit: number };

export async function POST(req: Request) {
  const { productName, flavorName, size, sellingPrice, ingredients } = await req.json();

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

  const validIngredients: IngredientInput[] = Array.isArray(ingredients)
    ? ingredients.filter((i: IngredientInput) => i.name?.trim() && i.quantity > 0 && i.unit?.trim())
    : [];

  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      flavorId,
      size: size.trim(),
      sellingPrice,
      ingredients: validIngredients.length
        ? {
            create: validIngredients.map((i) => ({
              name: i.name.trim(),
              quantity: i.quantity,
              unit: i.unit.trim(),
              pricePerUnit: i.pricePerUnit ?? 0,
            })),
          }
        : undefined,
    },
    include: {
      product: { select: { id: true, name: true } },
      flavor: { select: { id: true, name: true } },
      ingredients: true,
    },
  });

  return NextResponse.json(variant, { status: 201 });
}
