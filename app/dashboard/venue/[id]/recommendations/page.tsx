"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { ChevronLeft, AlertTriangle, TrendingDown, CheckCircle2, HelpCircle } from "lucide-react";

type Rec = {
  flavorId: string;
  flavorName: string;
  colorHex: string | null;
  riskLevel: "CRITICAL" | "LOW" | "SAFE" | "NO_DATA";
  currentStock: number;
  avgDailySales: number;
  daysOfStockLeft: number | null;
  recommendedRestockQty: number;
  reason: string;
};

type Venue = { id: string; name: string };

const RISK_CONFIG = {
  CRITICAL: { label: "Critical", icon: AlertTriangle, bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-700" },
  LOW: { label: "Low Stock", icon: TrendingDown, bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-700" },
  SAFE: { label: "Safe", icon: CheckCircle2, bg: "bg-green-50", border: "border-green-200", text: "text-green-700", badge: "bg-green-100 text-green-700" },
  NO_DATA: { label: "No Data", icon: HelpCircle, bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-500", badge: "bg-gray-100 text-gray-500" },
};

export default function VenueRecommendationsPage() {
  const { id } = useParams<{ id: string }>();
  const [recs, setRecs] = useState<Rec[]>([]);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/venues")
      .then((r) => r.json())
      .then((venues: Venue[]) => setVenue(venues.find((v) => v.id === id) ?? null))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/padel/recommendations?venueId=${id}`)
      .then((r) => r.json())
      .then((data) => { setRecs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  return (
    <>
      <Topbar title="Flavor Recommendations" subtitle={venue?.name} />
      <div className="flex-1 overflow-auto p-6 max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href={`/dashboard/venue/${id}`}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
          >
            <ChevronLeft size={16} />
            Back
          </Link>
          <p className="text-xs text-gray-400">Based on last 30 days of sales</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : recs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
            <p className="font-medium mb-1">No recommendations yet</p>
            <p className="text-sm">Log some sales and deliveries to get flavor insights.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recs.map((rec) => {
              const cfg = RISK_CONFIG[rec.riskLevel];
              const Icon = cfg.icon;
              return (
                <div key={rec.flavorId} className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      {rec.colorHex && (
                        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: rec.colorHex }} />
                      )}
                      <span className="font-semibold text-gray-900">{rec.flavorName}</span>
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      <Icon size={11} />
                      {cfg.label}
                    </span>
                  </div>
                  <p className={`text-sm mb-2 ${cfg.text}`}>{rec.reason}</p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Stock: <strong className="text-gray-700">{rec.currentStock} pcs</strong></span>
                    <span>Avg sales: <strong className="text-gray-700">{rec.avgDailySales.toFixed(1)}/day</strong></span>
                    {rec.daysOfStockLeft !== null && (
                      <span>Days left: <strong className="text-gray-700">{rec.daysOfStockLeft.toFixed(0)}</strong></span>
                    )}
                  </div>
                  {rec.recommendedRestockQty > 0 && (
                    <div className={`mt-3 pt-3 border-t ${cfg.border} flex justify-between items-center`}>
                      <span className="text-xs text-gray-500">Recommended restock</span>
                      <span className={`text-sm font-bold ${cfg.text}`}>{rec.recommendedRestockQty} pcs</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
