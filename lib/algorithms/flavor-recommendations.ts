export type FlavorSalesPoint = {
  date: string;
  flavorId: string;
  flavorName: string;
  quantitySold: number;
};

export type DeliveryPoint = {
  date: string;
  flavorId: string;
};

export type FlavorRecommendation = {
  flavorId: string;
  flavorName: string;
  colorHex: string | null;
  currentStock: number;
  dailyVelocity: number;
  daysRemaining: number | null;
  avgLeadTimeDays: number;
  riskLevel: "CRITICAL" | "LOW" | "SAFE" | "NO_DATA";
  recommendedRestockQty: number;
  trend: "increasing" | "stable" | "decreasing";
  lastSaleDate: string | null;
};

export function computeFlavorRecommendations(
  flavors: { id: string; name: string; colorHex: string | null }[],
  salesLast30Days: FlavorSalesPoint[],
  deliveries: DeliveryPoint[],
  currentStock: Record<string, number>
): FlavorRecommendation[] {
  const now = new Date();

  return flavors.map((flavor) => {
    const flavorSales = salesLast30Days
      .filter((s) => s.flavorId === flavor.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const flavorDeliveries = deliveries
      .filter((d) => d.flavorId === flavor.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const stock = currentStock[flavor.id] ?? 0;
    const lastSaleDate =
      flavorSales.length > 0 ? flavorSales[flavorSales.length - 1].date : null;

    if (flavorSales.length === 0) {
      return {
        flavorId: flavor.id,
        flavorName: flavor.name,
        colorHex: flavor.colorHex,
        currentStock: stock,
        dailyVelocity: 0,
        daysRemaining: null,
        avgLeadTimeDays: 7,
        riskLevel: "NO_DATA",
        recommendedRestockQty: 0,
        trend: "stable",
        lastSaleDate,
      };
    }

    const last14Days = flavorSales.filter(
      (s) =>
        (now.getTime() - new Date(s.date).getTime()) / 86400000 <= 14
    );
    const prior14Days = flavorSales.filter((s) => {
      const age = (now.getTime() - new Date(s.date).getTime()) / 86400000;
      return age > 14 && age <= 28;
    });

    const recentTotal = last14Days.reduce((a, s) => a + s.quantitySold, 0);
    const priorTotal = prior14Days.reduce((a, s) => a + s.quantitySold, 0);
    const dailyVelocity = recentTotal / 14;

    let trend: "increasing" | "stable" | "decreasing" = "stable";
    if (priorTotal > 0) {
      const ratio = recentTotal / priorTotal;
      if (ratio > 1.2) trend = "increasing";
      else if (ratio < 0.8) trend = "decreasing";
    }

    let avgLeadTimeDays = 7;
    if (flavorDeliveries.length >= 2) {
      let totalGap = 0;
      for (let i = 1; i < flavorDeliveries.length; i++) {
        totalGap +=
          (new Date(flavorDeliveries[i].date).getTime() -
            new Date(flavorDeliveries[i - 1].date).getTime()) /
          86400000;
      }
      avgLeadTimeDays = totalGap / (flavorDeliveries.length - 1);
    }

    const daysRemaining =
      dailyVelocity > 0 ? stock / dailyVelocity : stock > 0 ? 999 : 0;

    let riskLevel: FlavorRecommendation["riskLevel"] = "SAFE";
    if (daysRemaining < avgLeadTimeDays) riskLevel = "CRITICAL";
    else if (daysRemaining < avgLeadTimeDays * 1.5) riskLevel = "LOW";

    const trendMultiplier = trend === "increasing" ? 1.2 : trend === "decreasing" ? 0.9 : 1.0;
    const baseQty = avgLeadTimeDays * 2 * dailyVelocity * trendMultiplier;
    const recommendedRestockQty = Math.max(0, Math.ceil(baseQty - stock));

    return {
      flavorId: flavor.id,
      flavorName: flavor.name,
      colorHex: flavor.colorHex,
      currentStock: stock,
      dailyVelocity: Math.round(dailyVelocity * 10) / 10,
      daysRemaining: Math.round(daysRemaining * 10) / 10,
      avgLeadTimeDays: Math.round(avgLeadTimeDays),
      riskLevel,
      recommendedRestockQty,
      trend,
      lastSaleDate,
    };
  });
}
