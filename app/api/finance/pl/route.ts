import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;

  const startDate = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
  const endDate = month ? new Date(year, month, 0) : new Date(year, 11, 31);

  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    select: { category: true, amountIn: true, amountOut: true },
  });

  const byCategory: Record<string, { in: number; out: number }> = {};
  let totalIn = 0;
  let totalOut = 0;
  let rndTotal = 0;

  for (const t of transactions) {
    const cat = t.category;
    if (!byCategory[cat]) byCategory[cat] = { in: 0, out: 0 };
    const amountIn = parseFloat(String(t.amountIn ?? 0));
    const amountOut = parseFloat(String(t.amountOut ?? 0));
    byCategory[cat].in += amountIn;
    byCategory[cat].out += amountOut;
    if (cat === "RND") {
      rndTotal += amountOut;
    } else {
      totalIn += amountIn;
      totalOut += amountOut;
    }
  }

  return NextResponse.json({
    totalIn,
    totalOut,
    netProfit: totalIn - totalOut,
    rndTotal,
    byCategory,
    period: { year, month },
  });
}
