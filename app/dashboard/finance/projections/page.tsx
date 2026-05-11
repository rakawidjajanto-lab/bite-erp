"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { formatIDR } from "@/lib/formatters/currency";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { Info } from "lucide-react";

type ProjectionData = {
  history: { month: string; revenue: number; expenses: number }[];
  projections: {
    month: string;
    projectedRevenue: number;
    projectedExpenses: number;
    projectedProfit: number;
    confidenceScore: number;
    method: string;
  }[];
};

export default function ProjectionsPage() {
  const [data, setData] = useState<ProjectionData | null>(null);

  useEffect(() => {
    fetch("/api/finance/projections").then((r) => r.json()).then(setData);
  }, []);

  const chartData = [
    ...(data?.history.slice(-6) ?? []).map((h) => ({
      month: h.month,
      revenue: h.revenue,
      expenses: h.expenses,
      type: "actual",
    })),
    ...(data?.projections ?? []).map((p) => ({
      month: p.month + " (proj)",
      revenue: p.projectedRevenue,
      expenses: p.projectedExpenses,
      type: "projected",
    })),
  ];

  return (
    <>
      <Topbar title="Financial Projections" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Financial Projections</h2>
          <p className="text-sm text-gray-500 mt-1">
            Based on weighted moving average (3 months) or linear regression (6+ months of data)
          </p>
        </div>

        {data && data.history.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-2 text-sm text-amber-700">
            <Info size={16} className="mt-0.5 shrink-0" />
            Not enough historical data yet. Import your existing transactions to see projections.
          </div>
        )}

        {chartData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue & Expenses Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} tick={{ fontSize: 10 }} width={45} />
                <Tooltip formatter={(v: number) => formatIDR(v)} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {data && data.projections.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Next 3 Months Forecast</h3>
            {data.projections.map((p) => (
              <div key={p.month} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{p.month}</p>
                    <p className="text-xs text-gray-400">
                      Method: {p.method.replace("_", " ")} · Confidence: {p.confidenceScore}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${p.projectedProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {formatIDR(p.projectedProfit)}
                    </p>
                    <p className="text-xs text-gray-400">projected profit</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-green-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-green-600 mb-0.5">Projected Revenue</p>
                    <p className="font-bold text-green-700">{formatIDR(p.projectedRevenue)}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-red-500 mb-0.5">Projected Expenses</p>
                    <p className="font-bold text-red-600">{formatIDR(p.projectedExpenses)}</p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full"
                    style={{ width: `${p.confidenceScore}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Confidence: {p.confidenceScore}%</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
