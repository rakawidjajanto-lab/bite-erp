import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30");
  const venueId = searchParams.get("venueId") ?? undefined;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const venueFilter = venueId ? { venueId } : {};

  const [sales, deliveries] = await Promise.all([
    prisma.padelSale.findMany({
      where: { ...venueFilter, saleDate: { gte: startDate } },
      include: { flavor: true },
    }),
    prisma.padelDelivery.findMany({
      where: { ...venueFilter, deliveryDate: { gte: startDate } },
      include: { items: { include: { flavor: true } } },
    }),
  ]);

  const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(String(s.totalAmount)), 0);
  const totalCost = deliveries.reduce(
    (sum, d) =>
      sum + d.items.reduce((ds, i) => ds + i.quantity * parseFloat(String(i.unitCost)), 0),
    0
  );

  const byFlavor: Record<string, { name: string; revenue: number; qty: number }> = {};
  for (const s of sales) {
    if (!byFlavor[s.flavorId]) {
      byFlavor[s.flavorId] = { name: s.flavor.name, revenue: 0, qty: 0 };
    }
    byFlavor[s.flavorId].revenue += parseFloat(String(s.totalAmount));
    byFlavor[s.flavorId].qty += s.quantitySold;
  }

  const topFlavors = Object.entries(byFlavor)
    .map(([id, v]) => ({ flavorId: id, ...v }))
    .sort((a, b) => b.qty - a.qty);

  return NextResponse.json({
    totalRevenue,
    totalCost,
    grossProfit: totalRevenue - totalCost,
    margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
    topFlavors,
    days,
    venueId: venueId ?? null,
  });
}
