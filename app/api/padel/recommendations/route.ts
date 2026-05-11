import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeFlavorRecommendations } from "@/lib/algorithms/flavor-recommendations";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const venueId = searchParams.get("venueId") ?? undefined;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const venueFilter = venueId ? { venueId } : {};

  const [flavors, sales, deliveries, inventory] = await Promise.all([
    prisma.flavor.findMany({ where: { isActive: true }, select: { id: true, name: true, colorHex: true } }),
    prisma.padelSale.findMany({
      where: { ...venueFilter, saleDate: { gte: thirtyDaysAgo } },
      select: { flavorId: true, saleDate: true, quantitySold: true, flavor: { select: { name: true } } },
    }),
    prisma.padelDelivery.findMany({
      where: venueFilter,
      include: { items: { select: { flavorId: true } } },
      orderBy: { deliveryDate: "asc" },
    }),
    prisma.inventory.findMany({ select: { flavorId: true, quantity: true } }),
  ]);

  const currentStock: Record<string, number> = {};
  for (const inv of inventory) {
    if (inv.flavorId) currentStock[inv.flavorId] = inv.quantity;
  }

  const salesPoints = sales.map((s) => ({
    date: s.saleDate.toISOString().split("T")[0],
    flavorId: s.flavorId,
    flavorName: s.flavor.name,
    quantitySold: s.quantitySold,
  }));

  const deliveryPoints = deliveries.flatMap((d) =>
    d.items.map((i) => ({
      date: d.deliveryDate.toISOString().split("T")[0],
      flavorId: i.flavorId,
    }))
  );

  const recommendations = computeFlavorRecommendations(
    flavors,
    salesPoints,
    deliveryPoints,
    currentStock
  );

  return NextResponse.json(
    recommendations.sort((a, b) => {
      const order = { CRITICAL: 0, LOW: 1, SAFE: 2, NO_DATA: 3 };
      return order[a.riskLevel] - order[b.riskLevel];
    })
  );
}
