import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { projectNextMonths } from "@/lib/algorithms/financial-projections";

export async function GET() {
  const existing = await prisma.financialProjection.findMany({
    orderBy: { projectionMonth: "asc" },
    take: 12,
  });

  const history = await prisma.$queryRaw<
    { month: string; revenue: number; expenses: number }[]
  >`
    SELECT
      TO_CHAR(date, 'YYYY-MM') as month,
      SUM(COALESCE(amount_in, 0)) as revenue,
      SUM(COALESCE(amount_out, 0)) as expenses
    FROM transactions
    GROUP BY TO_CHAR(date, 'YYYY-MM')
    ORDER BY month DESC
    LIMIT 12
  `;

  const sorted = [...history].reverse();
  const computed = projectNextMonths(
    sorted.map((m) => ({
      month: m.month,
      revenue: Number(m.revenue),
      expenses: Number(m.expenses),
      profit: Number(m.revenue) - Number(m.expenses),
    }))
  );

  return NextResponse.json({ history: sorted, projections: computed, saved: existing });
}
