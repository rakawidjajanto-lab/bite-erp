import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const order = await prisma.platformOrder.findUnique({
    where: { id },
    select: { transactionId: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Items cascade-delete automatically via onDelete: Cascade on PlatformOrderItem.
  await prisma.platformOrder.delete({ where: { id } });

  // Clean up the linked transaction if one was created at import time.
  if (order.transactionId) {
    await prisma.transaction.delete({ where: { id: order.transactionId } });
  }

  return NextResponse.json({ ok: true });
}
