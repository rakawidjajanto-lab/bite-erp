import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const flavors = await prisma.flavor.findMany({
    where: { isActive: true },
    include: { product: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(flavors);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, productId, colorHex } = body;

  const flavor = await prisma.flavor.create({
    data: { name, productId, colorHex },
  });
  return NextResponse.json(flavor, { status: 201 });
}
