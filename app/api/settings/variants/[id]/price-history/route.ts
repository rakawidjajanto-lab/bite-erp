import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const history = await prisma.ingredientPriceHistory.findMany({
    where: { variantId: params.id },
    orderBy: { changedAt: "desc" },
    take: 30,
  });
  return NextResponse.json(history);
}
