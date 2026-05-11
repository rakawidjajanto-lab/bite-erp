"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PadelDeliveryForm } from "@/components/forms/PadelDeliveryForm";
import { Plus, ChevronLeft } from "lucide-react";

type DeliveryItem = {
  id: string;
  flavorId: string;
  quantity: number;
  unitCost: string;
  flavor: { name: string; colorHex: string | null };
};

type Delivery = {
  id: string;
  deliveryDate: string;
  notes: string | null;
  items: DeliveryItem[];
};

type Venue = { id: string; name: string };

export default function VenueDeliveriesPage() {
  const { id } = useParams<{ id: string }>();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
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
    fetch(`/api/padel/deliveries?venueId=${id}`)
      .then((r) => r.json())
      .then((data) => { setDeliveries(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id, refreshKey]);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }

  const sorted = [...deliveries].sort((a, b) =>
    new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
  );

  return (
    <>
      <Topbar title="Deliveries" subtitle={venue?.name} />
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
            Log Delivery
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse h-28" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
            <p className="font-medium mb-1">No deliveries recorded yet</p>
            <p className="text-sm">Log your first delivery with the button above.</p>
          </div>
        ) : (
          sorted.map((d) => {
            const totalQty = d.items.reduce((s, i) => s + i.quantity, 0);
            const totalCost = d.items.reduce((s, i) => s + i.quantity * Number(i.unitCost), 0);
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
                  <p className="text-sm font-medium text-gray-700">{formatDate(d.deliveryDate)}</p>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{totalQty} pcs</p>
                    <p className="text-sm font-bold text-gray-900">
                      Rp {totalCost.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {d.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {item.flavor.colorHex && (
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: item.flavor.colorHex }}
                          />
                        )}
                        <span className="text-sm text-gray-800">{item.flavor.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-700">{item.quantity} pcs</p>
                        <p className="text-xs text-gray-400">
                          @ Rp {Number(item.unitCost).toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {d.notes && (
                  <p className="px-4 pb-3 pt-1 text-xs text-gray-400 italic">{d.notes}</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <PadelDeliveryForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); setRefreshKey((k) => k + 1); }}
          venueId={id}
          venueName={venue?.name}
        />
      )}
    </>
  );
}
