import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const months = parseInt(searchParams.get("months") ?? "6");

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months + 1);
  startDate.setDate(1);

  const data = await prisma.$queryRaw<
    { month: string; money_in: number; money_out: number }[]
  >`
    SELECT
      TO_CHAR(date, 'YYYY-MM') as month,
      SUM(COALESCE(amount_in, 0)) as money_in,
      SUM(COALESCE(amount_out, 0)) as money_out
    FROM transactions
    WHERE date >= ${startDate}
    GROUP BY TO_CHAR(date, 'YYYY-MM')
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
