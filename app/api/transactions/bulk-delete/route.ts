import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const { ids } = (await req.json()) as { ids: string[] };
  if (!ids?.length) return NextResponse.json({ deleted: 0 });
  const { count } = await prisma.transaction.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ deleted: count });
}
