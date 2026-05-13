import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [txAgg, inventoryItems, rndAgg, giveawayItems, physicalAssetAgg] = await Promise.all([
    prisma.transaction.aggregate({ _sum: { amountIn: true, amountOut: true } }),
    prisma.inventory.findMany({
      include: { product: { select: { unitCost: true } } },
    }),
    prisma.rndExpense.aggregate({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),
    prisma.marketingGiveawayItem.findMany({
      where: { giveaway: { date: { gte: startOfMonth, lte: endOfMonth } } },
      select: { quantity: true, unitCost: true },
    }),
    prisma.physicalAsset.aggregate({ _sum: { currentValue: true } }),
  ]);

  const cashBalance =
    parseFloat(String(txAgg._sum.amountIn ?? 0)) -
    parseFloat(String(txAgg._sum.amountOut ?? 0));

  const inventoryValue = inventoryItems.reduce(
    (sum, item) =>
      sum + Math.max(0, item.quantity) * parseFloat(String(item.product.unitCost)),
    0
  );

  const rndThisMonth = parseFloat(String(rndAgg._sum.amount ?? 0));

  const marketingGiveawayValue = giveawayItems.reduce(
    (sum, item) => sum + item.quantity * parseFloat(String(item.unitCost)),
    0
  );

  const physicalAssetValue = parseFloat(String(physicalAssetAgg._sum.currentValue ?? 0));

  return NextResponse.json({
    cashBalance,
    inventoryValue,
    physicalAssetValue,
    totalAssets: cashBalance + inventoryValue + physicalAssetValue,
    rndThisMonth,
    marketingGiveawayValue,
  });
}
