"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { formatIDR } from "@/lib/formatters/currency";
import Link from "next/link";
import { TrendingUp, Package, Star, BarChart2 } from "lucide-react";

type Insight = {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  margin: number;
  topFlavors: { flavorId: string; name: string; revenue: number; qty: number }[];
};

type Rec = { flavorId: string; flavorName: string; riskLevel: string; currentStock: number };

export default function PadelPage() {
  const [insights, setInsights] = useState<Insight | null>(null);
  const [recs, setRecs] = useState<Rec[]>([]);

  useEffect(() => {
    fetch("/api/padel/insights?days=30").then((r) => r.json()).then(setInsights);
    fetch("/api/padel/recommendations").then((r) => r.json()).then(setRecs);
  }, []);

  const criticalCount = recs.filter((r) => r.riskLevel === "CRITICAL").length;

  const quickLinks = [
    { label: "Log Sales", href: "/dashboard/padel/sales", icon: TrendingUp, desc: "Record today's sales by flavor" },
    { label: "Log Delivery", href: "/dashboard/padel/deliveries", icon: Package, desc: "Record restock to venue" },
    { label: "Flavor Recs", href: "/dashboard/padel/recommendations", icon: Star, desc: `${criticalCount} flavor(s) need restocking` },
    { label: "Insights", href: "/dashboard/padel/insights", icon: BarChart2, desc: "Revenue, margin, top flavors" },
  ];

  return (
    <>
      <Topbar title="Padel Venue" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {insights ? (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 font-medium">Revenue (30d)</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatIDR(insights.totalRevenue)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 font-medium">Cost (30d)</p>
                <p className="text-2xl font-bold text-red-500 mt-1">{formatIDR(insights.totalCost)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 font-medium">Gross Profit</p>
                <p className={`text-2xl font-bold mt-1 ${insights.grossProfit >= 0 ? "text-gray-900" : "text-red-600"}`}>
                  {formatIDR(insights.grossProfit)}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 font-medium">Margin</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{insights.margin.toFixed(1)}%</p>
              </div>
            </>
          ) : (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-20 mb-2" />
                <div className="h-7 bg-gray-100 rounded w-28" />
              </div>
            ))
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickLinks.map(({ label, href, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-400 hover:shadow-sm transition flex flex-col gap-2"
            >
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                <Icon size={18} className="text-blue-600" />
              </div>
              <p className="font-semibold text-sm text-gray-900">{label}</p>
              <p className="text-xs text-gray-400 leading-tight">{desc}</p>
            </Link>
          ))}
        </div>

        {insights && insights.topFlavors.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Flavors (Last 30 Days)</h3>
            <div className="space-y-3">
              {insights.topFlavors.slice(0, 5).map((f, i) => (
                <div key={f.flavorId} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">{f.name}</span>
                      <span className="text-sm text-gray-500">{f.qty} pcs</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${(f.qty / (insights.topFlavors[0]?.qty || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-20 text-right">{formatIDR(f.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
