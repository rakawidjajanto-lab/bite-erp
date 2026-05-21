import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.customerOrder.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: { select: { name: true } },
              flavor: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

type OrderItemInput = {
  variantId: string;
  quantity: number;
  unitPrice: number;
};

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { customerName, orderDate, items, deliveryFee, notes } = await req.json() as {
    customerName: string;
    orderDate: string;
    items: OrderItemInput[];
    deliveryFee?: number;
    notes?: string;
  };

  const existing = await prisma.customerOrder.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fee = Number(deliveryFee ?? 0);
  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const total = subtotal + fee;

  // Delete old sales transaction
  if (existing.transactionId) {
    await prisma.transaction.delete({ where: { id: existing.transactionId } });
  }

  // Delete old delivery transaction
  await prisma.transaction.deleteMany({
    where: { referenceId: id, category: "OPERATIONAL", source: "ORDER" },
  });

  // Delete old items
  await prisma.customerOrderItem.deleteMany({ where: { orderId: id } });

  // Create new sales transaction
  const transaction = await prisma.transaction.create({
    data: {
      date: new Date(orderDate),
      description: `Order – ${customerName.trim()}`,
      category: "SALES",
      source: "ORDER",
      amountIn: subtotal,
    },
  });

  const order = await prisma.customerOrder.update({
    where: { id: id },
    data: {
      orderDate: new Date(orderDate),
      customerName: customerName.trim(),
      subtotal,
      deliveryFee: fee,
      total,
      notes: notes || null,
      transactionId: transaction.id,
      items: {
        create: items.map((it) => ({
          variantId: it.variantId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          subtotal: it.quantity * it.unitPrice,
        })),
      },
    },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: { select: { name: true } },
              flavor: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (fee > 0) {
    await prisma.transaction.create({
      data: {
        date: new Date(orderDate),
        description: `Delivery fee – ${customerName.trim()}`,
        category: "OPERATIONAL",
        source: "ORDER",
        amountOut: fee,
        referenceId: order.id,
      },
    });
  }

  return NextResponse.json(order);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await prisma.customerOrder.findUnique({
    where: { id },
    select: { transactionId: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete order first — removes the FK (order.transactionId → transaction.id)
  // CustomerOrderItem rows are cascade-deleted by the DB
  await prisma.customerOrder.delete({ where: { id } });

  // Now safely delete linked transactions
  await Promise.all([
    order.transactionId
      ? prisma.transaction.delete({ where: { id: order.transactionId } }).catch(() => {})
      : Promise.resolve(),
    prisma.transaction.deleteMany({
      where: { referenceId: id, category: "OPERATIONAL", source: "ORDER" },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
