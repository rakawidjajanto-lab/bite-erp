import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }

  const movements = await prisma.inventoryMovement.findMany({
    where,
    include: {
      product: { select: { name: true } },
      flavor: { select: { name: true, colorHex: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(movements);
}
