import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const { ids } = (await req.json()) as { ids: string[] };
  if (!ids?.length) return NextResponse.json({ deleted: 0 });

  // If any of the transactions are the primary SALES transaction for a CustomerOrder,
  // delete those orders first to remove the FK reference before deleteMany runs.
  const linkedOrders = await prisma.customerOrder.findMany({
    where: { transactionId: { in: ids } },
    select: { id: true },
  });

  if (linkedOrders.length > 0) {
    const orderIds = linkedOrders.map((o) => o.id);
    await prisma.customerOrder.deleteMany({ where: { id: { in: orderIds } } });
    // Clean up delivery-fee OPERATIONAL transactions linked to those orders
    await prisma.transaction.deleteMany({
      where: { referenceId: { in: orderIds }, source: "ORDER" },
    });
  }

  const { count } = await prisma.transaction.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ deleted: count });
}
