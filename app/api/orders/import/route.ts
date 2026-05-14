import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type OrderRow = {
  orderRef?: string;
  date: string;
  customerName: string;
  productName: string;
  flavorName?: string;
  size: string;
  quantity: number;
  unitPrice?: number;
  deliveryFee?: number;
  notes?: string;
};

type OrderGroup = {
  orderRef: string;
  date: string;
  customerName: string;
  deliveryFee: number;
  notes: string;
  rows: OrderRow[];
};

export async function POST(req: Request) {
  const { rows } = (await req.json()) as { rows: OrderRow[] };

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  // Group rows by orderRef; blank orderRef → each row is its own order
  const groups: OrderGroup[] = [];
  const refMap = new Map<string, OrderGroup>();

  for (const row of rows) {
    if (!row.customerName || !row.date || !row.productName || !row.size) {
      skipped++;
      continue;
    }

    const ref = row.orderRef?.trim() || "";
    if (ref && refMap.has(ref)) {
      refMap.get(ref)!.rows.push(row);
    } else {
      const group: OrderGroup = {
        orderRef: ref,
        date: row.date,
        customerName: row.customerName,
        deliveryFee: Number(row.deliveryFee ?? 0),
        notes: row.notes || "",
        rows: [row],
      };
      groups.push(group);
      if (ref) refMap.set(ref, group);
    }
  }

  for (const group of groups) {
    try {
      const itemData: { variantId: string; quantity: number; unitPrice: number; subtotal: number }[] = [];

      for (const row of group.rows) {
        const variant = await prisma.productVariant.findFirst({
          where: {
            size: { equals: row.size.trim(), mode: "insensitive" },
            product: { name: { equals: row.productName.trim(), mode: "insensitive" } },
            ...(row.flavorName?.trim()
              ? { flavor: { name: { equals: row.flavorName.trim(), mode: "insensitive" } } }
              : { flavorId: null }),
          },
        });

        if (!variant) { failed++; continue; }

        const unitPrice = row.unitPrice && row.unitPrice > 0 ? row.unitPrice : Number(variant.sellingPrice);
        itemData.push({
          variantId: variant.id,
          quantity: row.quantity,
          unitPrice,
          subtotal: row.quantity * unitPrice,
        });
      }

      if (!itemData.length) continue;

      const subtotal = itemData.reduce((s, it) => s + it.subtotal, 0);
      const total = subtotal + group.deliveryFee;

      const transaction = await prisma.transaction.create({
        data: {
          date: new Date(group.date),
          description: `Order – ${group.customerName}`,
          category: "SALES",
          source: "ORDER",
          amountIn: subtotal,
        },
      });

      const order = await prisma.customerOrder.create({
        data: {
          orderDate: new Date(group.date),
          customerName: group.customerName,
          subtotal,
          deliveryFee: group.deliveryFee,
          total,
          notes: group.notes || null,
          transactionId: transaction.id,
          items: { create: itemData },
        },
      });

      if (group.deliveryFee > 0) {
        await prisma.transaction.create({
          data: {
            date: new Date(group.date),
            description: `Delivery fee – ${group.customerName}`,
            category: "OPERATIONAL",
            source: "ORDER",
            amountOut: group.deliveryFee,
            referenceId: order.id,
          },
        });
      }

      imported++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ imported, skipped, failed });
}
