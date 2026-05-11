"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PadelSaleForm } from "@/components/forms/PadelSaleForm";
import { PadelDeliveryForm } from "@/components/forms/PadelDeliveryForm";
import {
  ShoppingBag,
  Truck,
  BarChart2,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  ArrowRight,
  MapPin,
} from "lucide-react";

type Venue = { id: string; name: string; location: string | null };
type Insights = {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  margin: number;
  topFlavors: { flavorId: string; name: string; qty: number; revenue: number }[];
  days: number;
};

function Kpi({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon size={18} />
      </div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="font-bold text-gray-900 text-lg leading-tight">{value}</p>
    </div>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export default function VenueDashboard() {
  const { id } = useParams<{ id: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [showSale, setShowSale] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/settings/venues")
      .then((r) => r.json())
      .then((venues: Venue[]) => setVenue(venues.find((v) => v.id === id) ?? null))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    fetch(`/api/padel/insights?venueId=${id}&days=30`)
      .then((r) => r.json())
      .then(setInsights)
      .catch(() => {});
  }, [id, refreshKey]);

  const onSaved = () => { setShowSale(false); setShowDelivery(false); setRefreshKey((k) => k + 1); };

  const quickLinks = [
    { label: "Sales Log", href: `/dashboard/venue/${id}/sales`, icon: ShoppingBag, color: "bg-green-50 text-green-600" },
    { label: "Deliveries", href: `/dashboard/venue/${id}/deliveries`, icon: Truck, color: "bg-blue-50 text-blue-600" },
    { label: "Recommendations", href: `/dashboard/venue/${id}/recommendations`, icon: Lightbulb, color: "bg-yellow-50 text-yellow-600" },
    { label: "Insights", href: `/dashboard/venue/${id}/insights`, icon: BarChart2, color: "bg-purple-50 text-purple-600" },
  ];

  return (
    <>
      <Topbar
        title={venue?.name ?? "Venue"}
        subtitle={venue?.location ?? undefined}
      />
      <div className="flex-1 overflow-auto p-6 space-y-6 max-w-4xl">
        {/* Quick actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowSale(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
          >
            <ShoppingBag size={15} />
            Log Sale
          </button>
          <button
            onClick={() => setShowDelivery(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
          >
            <Truck size={15} />
            Log Delivery
          </button>
        </div>

        {/* KPIs */}
        {insights && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3 font-medium">Last 30 Days</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Kpi label="Revenue" value={fmt(insights.totalRevenue)} icon={DollarSign} color="bg-green-50 text-green-600" />
              <Kpi label="Cost" value={fmt(insights.totalCost)} icon={TrendingDown} color="bg-red-50 text-red-500" />
              <Kpi label="Gross Profit" value={fmt(insights.grossProfit)} icon={TrendingUp} color="bg-blue-50 text-blue-600" />
              <Kpi label="Margin" value={`${insights.margin.toFixed(1)}%`} icon={Percent} color="bg-purple-50 text-purple-600" />
            </div>
          </div>
        )}

        {/* Quick links */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3 font-medium">Sections</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickLinks.map(({ label, href, icon: Icon, color }) => (
              <Link
                key={href}
                href={href}
                className="group bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all flex flex-col gap-3"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top flavors */}
        {insights && insights.topFlavors.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3 font-medium">Top Flavors (Last 30 Days)</p>
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
              {insights.topFlavors.slice(0, 5).map((f, i) => (
                <div key={f.flavorId} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-500 flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{f.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{f.qty} pcs</p>
                    <p className="text-xs text-gray-400">{fmt(f.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showSale && (
        <PadelSaleForm
          onClose={() => setShowSale(false)}
          onSaved={onSaved}
          venueId={id}
          venueName={venue?.name}
        />
      )}
      {showDelivery && (
        <PadelDeliveryForm
          onClose={() => setShowDelivery(false)}
          onSaved={onSaved}
          venueId={id}
          venueName={venue?.name}
        />
      )}
    </>
  );
}
