"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PadelSaleForm } from "@/components/forms/PadelSaleForm";
import { Plus, ChevronLeft } from "lucide-react";

type Sale = {
  id: string;
  saleDate: string;
  quantitySold: number;
  unitPrice: number;
  totalAmount: string;
  notes: string | null;
  flavor: { name: string; colorHex: string | null };
};

type Venue = { id: string; name: string };

export default function VenueSalesPage() {
  const { id } = useParams<{ id: string }>();
  const [sales, setSales] = useState<Sale[]>([]);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/settings/venues")
      .then((r) => r.json())
      .then((venues: Venue[]) => setVenue(venues.find((v) => v.id === id) ?? null))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/padel/sales?venueId=${id}&days=365`)
      .then((r) => r.json())
      .then((data) => { setSales(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id, refreshKey]);

  const byDate: Record<string, Sale[]> = {};
  for (const s of sales) {
    const d = s.saleDate.split("T")[0];
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(s);
  }
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <>
      <Topbar title="Sales Log" subtitle={venue?.name} />
      <div className="flex-1 overflow-auto p-6 max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href={`/dashboard/venue/${id}`}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
          >
            <ChevronLeft size={16} />
            Back
          </Link>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
          >
            <Plus size={14} />
            Log Sale
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
            <p className="font-medium mb-1">No sales recorded yet</p>
            <p className="text-sm">Log your first sale with the button above.</p>
          </div>
        ) : (
          sortedDates.map((date) => (
            <div key={date}>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{formatDate(date)}</p>
              <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
                {byDate[date].map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      {s.flavor.colorHex && (
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: s.flavor.colorHex }}
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.flavor.name}</p>
                        <p className="text-xs text-gray-400">
                          {s.quantitySold} pcs × Rp {Number(s.unitPrice).toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      Rp {Number(s.totalAmount).toLocaleString("id-ID")}
                    </p>
                  </div>
                ))}
                <div className="px-4 py-2 flex justify-between bg-gray-50 rounded-b-2xl">
                  <span className="text-xs text-gray-500 font-medium">Day total</span>
                  <span className="text-xs font-bold text-gray-700">
                    Rp {byDate[date].reduce((s, x) => s + Number(x.totalAmount), 0).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <PadelSaleForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); setRefreshKey((k) => k + 1); }}
          venueId={id}
          venueName={venue?.name}
        />
      )}
    </>
  );
}
