import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCSVText, normalizeTokopediaRow } from "@/lib/import/platform-normalizer";

export async function POST(req: Request) {
  const body = await req.json();
  const { csvText } = body;

  const rows = parseCSVText(csvText);
  let platform = await prisma.platform.findUnique({ where: { name: "Tokopedia" } });
  if (!platform) {
    platform = await prisma.platform.create({ data: { name: "Tokopedia" } });
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const normalized = normalizeTokopediaRow(row);
    if (!normalized) { skipped++; continue; }

    try {
      const existing = await prisma.platformOrder.findUnique({
        where: { platformId_externalOrderId: { platformId: platform.id, externalOrderId: normalized.externalOrderId } },
      });

      if (existing) { skipped++; continue; }

      const tx = await prisma.transaction.create({
        data: {
          date: new Date(normalized.orderDate),
          description: `Tokopedia order #${normalized.externalOrderId}`,
          category: "SALES",
          amountIn: normalized.netAmount,
          source: "TOKOPEDIA",
        },
      });

      await prisma.platformOrder.create({
        data: {
          platformId: platform.id,
          externalOrderId: normalized.externalOrderId,
          orderDate: new Date(normalized.orderDate),
          status: normalized.status as never,
          grossAmount: normalized.grossAmount,
          platformFee: normalized.platformFee,
          shippingCost: normalized.shippingCost,
          discount: normalized.discount,
          netAmount: normalized.netAmount,
          customerName: normalized.customerName,
          transactionId: tx.id,
          rawData: normalized.rawData,
        },
      });
      imported++;
    } catch (err) {
      errors.push(String(err));
    }
  }

  return NextResponse.json({ imported, skipped, failed: errors.length, errors: errors.slice(0, 5) });
}
