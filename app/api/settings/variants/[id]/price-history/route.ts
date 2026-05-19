import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const history = await prisma.ingredientPriceHistory.findMany({
    where: { variantId: id },
    orderBy: { changedAt: "desc" },
    take: 30,
  });
  return NextResponse.json(history);
}
