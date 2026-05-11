"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { ChevronLeft } from "lucide-react";

type Insights = {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  margin: number;
  topFlavors: { flavorId: string; name: string; qty: number; revenue: number }[];
  days: number;
};

type Venue = { id: string; name: string };

const PERIODS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

function fmt(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export default function VenueInsightsPage() {
  const { id } = useParams<{ id: string }>();
  const [days, setDays] = useState(30);
  const [insights, setInsights] = useState<Insights | null>(null);
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
    fetch(`/api/padel/insights?venueId=${id}&days=${days}`)
      .then((r) => r.json())
      .then((data) => { setInsights(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id, days]);

  const maxQty = insights ? Math.max(...insights.topFlavors.map((f) => f.qty), 1) : 1;

  return (
    <>
      <Topbar title="Insights" subtitle={venue?.name} />
      <div className="flex-1 overflow-auto p-6 max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/dashboard/venue/${id}`}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
          >
            <ChevronLeft size={16} />
            Back
          </Link>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setDays(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  days === p.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse h-36" />
            ))}
          </div>
        ) : !insights ? null : (
          <>
            {/* P&L summary */}
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
              <div className="px-5 py-4 flex justify-between items-center">
                <span className="text-sm text-gray-600">Revenue</span>
                <span className="font-semibold text-gray-900">{fmt(insights.totalRevenue)}</span>
              </div>
              <div className="px-5 py-4 flex justify-between items-center">
                <span className="text-sm text-gray-600">Cost of Goods</span>
                <span className="font-semibold text-red-600">− {fmt(insights.totalCost)}</span>
              </div>
              <div className="px-5 py-4 flex justify-between items-center bg-gray-50 rounded-b-2xl">
                <span className="text-sm font-semibold text-gray-800">Gross Profit</span>
                <div className="text-right">
                  <p className={`font-bold text-lg ${insights.grossProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {fmt(insights.grossProfit)}
                  </p>
                  <p className="text-xs text-gray-400">Margin {insights.margin.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* Flavor breakdown */}
            {insights.topFlavors.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Sales by Flavor</h3>
                <div className="space-y-3">
                  {insights.topFlavors.map((f, i) => (
                    <div key={f.flavorId}>
                      <div className="flex justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-xs w-4">{i + 1}</span>
                          <span className="font-medium text-gray-800">{f.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-gray-900">{f.qty} pcs</span>
                          <span className="text-xs text-gray-400 ml-2">{fmt(f.revenue)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(f.qty / maxQty) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights.topFlavors.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-center text-gray-400">
                <p className="font-medium mb-1">No sales data</p>
                <p className="text-sm">Log some sales to see flavor insights.</p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
