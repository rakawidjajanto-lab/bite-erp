import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RndRow = {
  date: string;
  description: string;
  subCategory: string;
  amount: number;
};

export async function POST(req: Request) {
  const { projectId, rows } = (await req.json()) as { projectId: string; rows: RndRow[] };

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.description || !row.amount) { skipped++; continue; }
    try {
      await prisma.rndExpense.create({
        data: {
          projectId,
          date: new Date(row.date),
          description: row.description,
          amount: row.amount,
          subCategory: row.subCategory || "other",
        },
      });
      imported++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ imported, skipped, failed });
}
