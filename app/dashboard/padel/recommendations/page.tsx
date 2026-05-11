"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { FlavorRecommendation } from "@/lib/algorithms/flavor-recommendations";

const riskConfig = {
  CRITICAL: { label: "CRITICAL", color: "bg-red-100 text-red-700 border-red-300", icon: "🔴" },
  LOW: { label: "LOW STOCK", color: "bg-yellow-100 text-yellow-700 border-yellow-300", icon: "🟡" },
  SAFE: { label: "SAFE", color: "bg-green-100 text-green-700 border-green-300", icon: "🟢" },
  NO_DATA: { label: "NO DATA", color: "bg-gray-100 text-gray-500 border-gray-200", icon: "⚪" },
};

export default function RecommendationsPage() {
  const [recs, setRecs] = useState<FlavorRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/padel/recommendations")
      .then((r) => r.json())
      .then(setRecs)
      .finally(() => setLoading(false));
  }, []);

  const criticalCount = recs.filter((r) => r.riskLevel === "CRITICAL").length;
  const lowCount = recs.filter((r) => r.riskLevel === "LOW").length;

  return (
    <>
      <Topbar title="Flavor Recommendations" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Stocking Recommendations</h2>
            <p className="text-sm text-gray-500">Based on 14-day sales velocity at padel venue</p>
          </div>
          {(criticalCount > 0 || lowCount > 0) && (
            <div className="flex items-center gap-1.5 bg-red-50 text-red-700 text-sm font-medium px-3 py-2 rounded-xl border border-red-200">
              <AlertTriangle size={15} />
              {criticalCount + lowCount} flavor(s) need attention
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-24 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-40" />
              </div>
            ))}
          </div>
        ) : recs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
            No flavors configured yet. Add flavors in Settings first.
          </div>
        ) : (
          <div className="space-y-3">
            {recs.map((rec) => {
              const config = riskConfig[rec.riskLevel];
              return (
                <div
                  key={rec.flavorId}
                  className={`bg-white rounded-xl border-2 p-4 ${config.color}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {rec.colorHex && (
                        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: rec.colorHex }} />
                      )}
                      <span className="font-semibold text-gray-900">{rec.flavorName}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${config.color}`}>
                      {config.icon} {config.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Stock</p>
                      <p className="font-bold text-gray-900">{rec.currentStock} pcs</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Days left</p>
                      <p className="font-bold text-gray-900">
                        {rec.daysRemaining === null ? "—" : rec.daysRemaining > 99 ? "99+" : `${rec.daysRemaining}d`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Daily vel.</p>
                      <p className="font-bold text-gray-900">{rec.dailyVelocity}/day</p>
                    </div>
                  </div>

                  {rec.recommendedRestockQty > 0 && (
                    <div className="mt-3 bg-white/70 rounded-lg px-3 py-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">Restock recommendation</span>
                      <span className="text-sm font-bold text-blue-700">{rec.recommendedRestockQty} pcs</span>
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                    {rec.trend === "increasing" ? (
                      <TrendingUp size={12} className="text-green-500" />
                    ) : rec.trend === "decreasing" ? (
                      <TrendingDown size={12} className="text-red-400" />
                    ) : (
                      <Minus size={12} />
                    )}
                    Sales trend: {rec.trend}
                    {rec.lastSaleDate && (
                      <span className="ml-2">
                        &middot; Last sale: {new Date(rec.lastSaleDate).toLocaleDateString("id-ID")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
