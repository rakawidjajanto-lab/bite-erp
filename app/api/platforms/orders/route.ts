import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "100");

  const where = platform
    ? { platform: { name: { equals: platform, mode: "insensitive" as const } } }
    : {};

  const [items, total] = await Promise.all([
    prisma.platformOrder.findMany({
      where,
      include: { platform: { select: { name: true } } },
      orderBy: { orderDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.platformOrder.count({ where }),
  ]);

  return NextResponse.json({ items, total });
}
