import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateRange =
    from || to
      ? {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
        }
      : undefined;

  const [customerItems, platformItems] = await Promise.all([
    prisma.customerOrderItem.findMany({
      where: dateRange ? { order: { orderDate: dateRange } } : {},
      select: {
        quantity: true,
        subtotal: true,
        variant: {
          select: { flavor: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.platformOrderItem.findMany({
      where: dateRange ? { order: { orderDate: dateRange } } : {},
      select: {
        quantity: true,
        subtotal: true,
        productName: true,
        flavor: { select: { id: true, name: true } },
      },
    }),
  ]);

  const map = new Map<string, { name: string; units: number; revenue: number }>();

  function add(key: string, name: string, qty: number, sub: number) {
    const e = map.get(key) ?? { name, units: 0, revenue: 0 };
    e.units += qty;
    e.revenue += sub;
    map.set(key, e);
  }

  for (const item of customerItems) {
    const f = item.variant?.flavor;
    add(f?.id ?? "__unknown_direct__", f?.name ?? "Unknown (Direct)", item.quantity, Number(item.subtotal));
  }

  for (const item of platformItems) {
    const f = item.flavor;
    // Fall back to the first segment of productName when flavor wasn't matched at import.
    const fallbackName = item.productName?.split(" - ")[0]?.trim() ?? "Unknown (Platform)";
    add(f?.id ?? `__platform_${fallbackName}`, f?.name ?? fallbackName, item.quantity, Number(item.subtotal));
  }

  const result = Array.from(map.values())
    .filter((r) => r.units > 0)
    .sort((a, b) => b.revenue - a.revenue);

  return NextResponse.json(result);
}
