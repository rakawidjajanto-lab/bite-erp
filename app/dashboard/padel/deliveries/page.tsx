"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PadelDeliveryForm } from "@/components/forms/PadelDeliveryForm";
import { formatIDR } from "@/lib/formatters/currency";
import { Plus } from "lucide-react";

type Delivery = {
  id: string;
  deliveryDate: string;
  totalItems: number;
  notes: string | null;
  items: { flavor: { name: string }; quantity: number; unitCost: string }[];
};

export default function PadelDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [showForm, setShowForm] = useState(false);

  const fetchDeliveries = () =>
    fetch("/api/padel/deliveries").then((r) => r.json()).then(setDeliveries);

  useEffect(() => { fetchDeliveries(); }, []);

  return (
    <>
      <Topbar title="Padel Deliveries" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Delivery Log</h2>
            <p className="text-sm text-gray-500">Restock history to padel venue</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Log Delivery
          </button>
        </div>

        <div className="space-y-3">
          {deliveries.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
              No deliveries logged yet.
            </div>
          ) : deliveries.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {new Date(d.deliveryDate).toLocaleDateString("id-ID", {
                      weekday: "short", day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                  {d.notes && <p className="text-xs text-gray-400 mt-0.5">{d.notes}</p>}
                </div>
                <span className="text-sm font-bold text-blue-600">{d.totalItems} pcs</span>
              </div>
              <div className="space-y-1.5">
                {d.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.flavor.name}</span>
                    <span className="text-gray-500">
                      {item.quantity} pcs &times; {formatIDR(parseFloat(item.unitCost))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <PadelDeliveryForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchDeliveries(); }}
        />
      )}
    </>
  );
}
