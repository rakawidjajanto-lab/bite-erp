export type MonthlyFinancials = {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
};

export type Projection = {
  month: string;
  projectedRevenue: number;
  projectedExpenses: number;
  projectedProfit: number;
  confidenceScore: number;
  method: "moving_average" | "linear_regression";
};

function weightedMovingAverage(values: number[], weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  const weightedSum = values.reduce((sum, v, i) => sum + v * weights[i], 0);
  return weightedSum / total;
}

function linearRegression(points: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
} {
  const n = points.length;
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumXX = points.reduce((a, p) => a + p.x * p.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function computeConfidence(actuals: number[], predicted: number[]): number {
  if (actuals.length === 0) return 0;
  const mean = actuals.reduce((a, b) => a + b, 0) / actuals.length;
  if (mean === 0) return 0;
  const residuals = actuals.map((a, i) => Math.abs(a - predicted[i]));
  const stdDev = Math.sqrt(
    residuals.reduce((a, r) => a + r * r, 0) / residuals.length
  );
  return Math.max(0, Math.min(100, Math.round((1 - stdDev / mean) * 100)));
}

function addMonths(base: string, n: number): string {
  const d = new Date(base + "-01");
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 7);
}

export function projectNextMonths(
  history: MonthlyFinancials[],
  monthsAhead = 3
): Projection[] {
  if (history.length === 0) return [];

  const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month));
  const lastMonth = sorted[sorted.length - 1].month;
  const useRegression = sorted.length >= 6;

  const projections: Projection[] = [];

  for (let i = 1; i <= monthsAhead; i++) {
    const targetMonth = addMonths(lastMonth, i);

    if (useRegression) {
      const revPoints = sorted.map((m, idx) => ({ x: idx, y: m.revenue }));
      const expPoints = sorted.map((m, idx) => ({ x: idx, y: m.expenses }));
      const revReg = linearRegression(revPoints);
      const expReg = linearRegression(expPoints);
      const x = sorted.length - 1 + i;
      const projRev = Math.max(0, revReg.slope * x + revReg.intercept);
      const projExp = Math.max(0, expReg.slope * x + expReg.intercept);

      const predictedRevs = sorted.map(
        (_, idx) => revReg.slope * idx + revReg.intercept
      );
      const confidence = computeConfidence(
        sorted.map((m) => m.revenue),
        predictedRevs
      );

      projections.push({
        month: targetMonth,
        projectedRevenue: Math.round(projRev),
        projectedExpenses: Math.round(projExp),
        projectedProfit: Math.round(projRev - projExp),
        confidenceScore: confidence,
        method: "linear_regression",
      });
    } else {
      const recent = sorted.slice(-3);
      const weights = recent.length === 3 ? [0.2, 0.3, 0.5] : [0.3, 0.7];
      const revValues = recent.map((m) => m.revenue);
      const expValues = recent.map((m) => m.expenses);
      const w = weights.slice(-recent.length);
      const projRev = weightedMovingAverage(revValues, w);
      const projExp = weightedMovingAverage(expValues, w);

      projections.push({
        month: targetMonth,
        projectedRevenue: Math.round(projRev),
        projectedExpenses: Math.round(projExp),
        projectedProfit: Math.round(projRev - projExp),
        confidenceScore: Math.min(60, recent.length * 20),
        method: "moving_average",
      });
    }
  }

  return projections;
}
