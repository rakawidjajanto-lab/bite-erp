import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type AssetRow = {
  name: string;
  category: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  notes?: string;
};

const VALID_CATEGORIES = ["MACHINE", "FREEZER", "FURNITURE", "VEHICLE", "ELECTRONICS", "OTHER"] as const;
type AssetCategory = (typeof VALID_CATEGORIES)[number];

export async function POST(req: Request) {
  const { rows } = (await req.json()) as { rows: AssetRow[] };

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.name || row.purchasePrice <= 0) { skipped++; continue; }

    const category: AssetCategory = VALID_CATEGORIES.includes(row.category as AssetCategory)
      ? (row.category as AssetCategory)
      : "OTHER";

    try {
      await prisma.physicalAsset.create({
        data: {
          name: row.name,
          category,
          purchaseDate: new Date(row.purchaseDate),
          purchasePrice: row.purchasePrice,
          currentValue: row.currentValue > 0 ? row.currentValue : row.purchasePrice,
          notes: row.notes || null,
        },
      });

      await prisma.transaction.create({
        data: {
          date: new Date(row.purchaseDate),
          description: row.name,
          category: "INVESTMENT",
          amountOut: row.purchasePrice,
          source: "EXCEL_IMPORT",
        },
      });

      imported++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ imported, skipped, failed });
}
