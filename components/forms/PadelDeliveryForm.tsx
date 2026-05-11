"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

type Flavor = { id: string; name: string; colorHex: string | null };
type DeliveryEntry = { flavorId: string; quantity: number; unitCost: number };

export function PadelDeliveryForm({
  onClose,
  onSaved,
  venueId: fixedVenueId,
  venueName,
}: {
  onClose: () => void;
  onSaved: () => void;
  venueId?: string;
  venueName?: string;
}) {
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [venueId, setVenueId] = useState(fixedVenueId ?? "");
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<DeliveryEntry[]>([{ flavorId: "", quantity: 1, unitCost: 0 }]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/flavors").then((r) => r.json()).then(setFlavors).catch(() => {});
    if (!fixedVenueId) {
      fetch("/api/settings/venues").then((r) => r.json()).then((v) => {
        setVenues(v);
        if (v.length > 0) setVenueId(v[0].id);
      }).catch(() => {});
    }
  }, [fixedVenueId]);

  function addItem() {
    setItems((prev) => [...prev, { flavorId: "", quantity: 1, unitCost: 0 }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function update(idx: number, field: keyof DeliveryEntry, value: string | number) {
    setItems((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  }

  const totalCost = items.reduce((s, e) => s + e.quantity * e.unitCost, 0);
  const totalItems = items.reduce((s, e) => s + e.quantity, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!venueId) return alert("Select a venue first");
    setSaving(true);
    await fetch("/api/padel/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueId, deliveryDate, items, notes }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-3 sm:p-6">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-semibold text-gray-900">Log Delivery</h2>
            {venueName && <p className="text-xs text-gray-400 mt-0.5">{venueName}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {!fixedVenueId && venues.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Items Delivered</label>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  {flavors.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {flavors.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => update(idx, "flavorId", f.id)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition ${
                            item.flavorId === f.id
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 bg-white text-gray-600"
                          }`}
                        >
                          {f.colorHex && (
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: f.colorHex }} />
                          )}
                          {f.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Flavor"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                      onChange={(e) => update(idx, "flavorId", e.target.value)}
                    />
                  )}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Qty (pcs)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => update(idx, "quantity", parseInt(e.target.value) || 1)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Unit Cost (IDR)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={item.unitCost}
                        onChange={(e) => update(idx, "unitCost", parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="self-end p-2.5 text-red-400 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem} className="mt-2 flex items-center gap-1 text-sm text-blue-600">
              <Plus size={14} />
              Add another flavor
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none"
            />
          </div>

          <div className="bg-blue-50 rounded-xl px-4 py-3 flex justify-between">
            <div>
              <p className="text-xs text-blue-600">Total items</p>
              <p className="font-bold text-blue-700">{totalItems} pcs</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-600">Total cost</p>
              <p className="font-bold text-blue-700">Rp {totalCost.toLocaleString("id-ID")}</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || items.some((i) => !i.flavorId)}
            className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? "Saving..." : "Save Delivery"}
          </button>
        </form>
      </div>
    </div>
  );
}
