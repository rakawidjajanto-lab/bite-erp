import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const months = parseInt(searchParams.get("months") ?? "6");

  const data = await prisma.$queryRaw<
    { month: string; money_in: number; money_out: number }[]
  >`
    SELECT month, money_in, money_out FROM (
      SELECT
        TO_CHAR(date, 'YYYY-MM') AS month,
        SUM(COALESCE("amountIn", 0))  AS money_in,
        SUM(COALESCE("amountOut", 0)) AS money_out
      FROM transactions
      WHERE category NOT IN ('RND', 'INVESTMENT')
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT ${months}
    ) sub
    ORDER BY month ASC
  `;

  return NextResponse.json(
    data.map((d) => ({
      month: d.month,
      moneyIn: Number(d.money_in),
      moneyOut: Number(d.money_out),
      net: Number(d.money_in) - Number(d.money_out),
    }))
  );
}
