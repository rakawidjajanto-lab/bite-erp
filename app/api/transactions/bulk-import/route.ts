import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type ImportRow = {
  date: string | null;
  description: string;
  category: string;
  amountIn: number | null;
  amountOut: number | null;
};

export async function POST(req: Request) {
  const body = await req.json();
  const rows: ImportRow[] = body.rows ?? [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      if (!row.description && !row.amountIn && !row.amountOut) {
        skipped++;
        continue;
      }

      const existing = await prisma.transaction.findFirst({
        where: {
          description: row.description,
          date: row.date ? new Date(row.date) : undefined,
          amountIn: row.amountIn ?? undefined,
          amountOut: row.amountOut ?? undefined,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.transaction.create({
        data: {
          date: row.date ? new Date(row.date) : new Date(),
          description: row.description || "Imported transaction",
          category: (row.category as never) ?? "OTHER_INCOME",
          amountIn: row.amountIn ?? null,
          amountOut: row.amountOut ?? null,
          source: "EXCEL_IMPORT",
        },
      });
      imported++;
    } catch (err) {
      errors.push(`Row "${row.description}": ${String(err)}`);
    }
  }

  return NextResponse.json({
    imported,
    skipped,
    failed: errors.length,
    errors: errors.slice(0, 10),
  });
}
