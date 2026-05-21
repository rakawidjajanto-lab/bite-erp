import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [txResult, inventoryResult, rndResult, giveawayResult, physicalResult] =
    await Promise.allSettled([
      prisma.$queryRaw<[{ total_in: string; total_out: string }]>`
        SELECT
          SUM(COALESCE("amountIn", 0)) AS total_in,
          SUM(COALESCE("amountOut", 0)) AS total_out
        FROM transactions
      `,
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

  const txRaw =
    txResult.status === "fulfilled"
      ? txResult.value
      : [{ total_in: "0", total_out: "0" }];
  const inventoryItems =
    inventoryResult.status === "fulfilled" ? inventoryResult.value : [];
  const rndAgg =
    rndResult.status === "fulfilled"
      ? rndResult.value
      : { _sum: { amount: null } };
  const giveawayItems =
    giveawayResult.status === "fulfilled" ? giveawayResult.value : [];
  const physicalAssetAgg =
    physicalResult.status === "fulfilled"
      ? physicalResult.value
      : { _sum: { currentValue: null } };

  const cashBalance =
    Number(txRaw[0]?.total_in ?? 0) - Number(txRaw[0]?.total_out ?? 0);
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
  const physicalAssetValue = parseFloat(
    String(physicalAssetAgg._sum.currentValue ?? 0)
  );

  return NextResponse.json({
    cashBalance,
    inventoryValue,
    physicalAssetValue,
    totalAssets: cashBalance + inventoryValue + physicalAssetValue,
    rndThisMonth,
    marketingGiveawayValue,
  });
}
