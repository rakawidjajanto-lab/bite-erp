import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const customer = searchParams.get("customer");

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.orderDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  if (customer) {
    where.customerName = { contains: customer, mode: "insensitive" };
  }

  const orders = await prisma.customerOrder.findMany({
    where,
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
    orderBy: { orderDate: "desc" },
  });

  return NextResponse.json(orders);
}

type OrderItemInput = {
  variantId: string;
  quantity: number;
  unitPrice: number;
};

export async function POST(req: Request) {
  const { customerName, orderDate, items, deliveryFee, notes, discountType, discountValue } = await req.json() as {
    customerName: string;
    orderDate: string;
    items: OrderItemInput[];
    deliveryFee?: number;
    notes?: string;
    discountType?: "PERCENTAGE" | "FIXED";
    discountValue?: number;
  };

  if (!customerName?.trim() || !orderDate || !items?.length) {
    return NextResponse.json({ error: "customerName, orderDate and items are required" }, { status: 400 });
  }

  const fee = Number(deliveryFee ?? 0);
  const dType = discountType ?? "FIXED";
  const dValue = Number(discountValue ?? 0);
  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const discountAmount = dType === "PERCENTAGE" ? subtotal * (dValue / 100) : dValue;
  const total = subtotal - discountAmount + fee;

  const transaction = await prisma.transaction.create({
    data: {
      date: new Date(orderDate),
      description: `Order – ${customerName.trim()}`,
      category: "SALES",
      source: "ORDER",
      amountIn: subtotal - discountAmount,
    },
  });

  const order = await prisma.customerOrder.create({
    data: {
      orderDate: new Date(orderDate),
      customerName: customerName.trim(),
      subtotal,
      deliveryFee: fee,
      discountType: dType,
      discountValue: discountAmount,
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

  return NextResponse.json(order, { status: 201 });
}
