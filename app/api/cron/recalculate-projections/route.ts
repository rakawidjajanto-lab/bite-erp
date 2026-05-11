import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { projectNextMonths } from "@/lib/algorithms/financial-projections";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const history = await prisma.$queryRaw<
    { month: string; revenue: bigint; expenses: bigint }[]
  >`
    SELECT
      TO_CHAR(date, 'YYYY-MM') as month,
      SUM(COALESCE(amount_in, 0)) as revenue,
      SUM(COALESCE(amount_out, 0)) as expenses
    FROM transactions
    GROUP BY TO_CHAR(date, 'YYYY-MM')
    ORDER BY month ASC
  `;

  const sorted = history.map((h) => ({
    month: h.month,
    revenue: Number(h.revenue),
    expenses: Number(h.expenses),
    profit: Number(h.revenue) - Number(h.expenses),
  }));

  const projections = projectNextMonths(sorted);

  for (const p of projections) {
    await prisma.financialProjection.upsert({
      where: { projectionMonth: new Date(p.month + "-01") },
      update: {
        projectedRevenue: p.projectedRevenue,
        projectedExpenses: p.projectedExpenses,
        projectedProfit: p.projectedProfit,
        confidenceScore: p.confidenceScore,
        method: p.method,
      },
      create: {
        projectionMonth: new Date(p.month + "-01"),
        projectedRevenue: p.projectedRevenue,
        projectedExpenses: p.projectedExpenses,
        projectedProfit: p.projectedProfit,
        confidenceScore: p.confidenceScore,
        method: p.method,
      },
    });
  }

  return NextResponse.json({ ok: true, projections });
}
