import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const orders = await prisma.customerOrder.findMany({
    select: { customerName: true },
    distinct: ["customerName"],
    orderBy: { customerName: "asc" },
  });
  return NextResponse.json(orders.map((o) => o.customerName));
}
