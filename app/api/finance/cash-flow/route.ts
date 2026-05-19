import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const months = parseInt(searchParams.get("months") ?? "6");

  // Window function runs over ALL months before LIMIT, so running_balance is truly all-time.
  const data = await prisma.$queryRaw<
    { month: string; money_in: number; money_out: number; running_balance: number }[]
  >`
    SELECT month, money_in, money_out, running_balance
    FROM (
      SELECT
        month, money_in, money_out,
        SUM(money_in - money_out) OVER (ORDER BY month) AS running_balance
      FROM (
        SELECT
          TO_CHAR(date, 'YYYY-MM') AS month,
          SUM(CASE WHEN category NOT IN ('RND', 'INVESTMENT') THEN COALESCE("amountIn", 0) ELSE 0 END) AS money_in,
          SUM(CASE WHEN category != 'RND' THEN COALESCE("amountOut", 0) ELSE 0 END) AS money_out
        FROM transactions
        GROUP BY TO_CHAR(date, 'YYYY-MM')
      ) grouped
      ORDER BY month DESC
      LIMIT ${months}
    ) recent
    ORDER BY month ASC
  `;

  return NextResponse.json(
    data.map((d) => ({
      month: d.month,
      moneyIn: Number(d.money_in),
      moneyOut: Number(d.money_out),
      net: Number(d.money_in) - Number(d.money_out),
      runningBalance: Number(d.running_balance),
    }))
  );
}
