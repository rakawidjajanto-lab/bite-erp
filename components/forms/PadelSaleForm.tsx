"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

type Flavor = { id: string; name: string; colorHex: string | null };
type SaleEntry = { flavorId: string; quantitySold: number; unitPrice: number };

export function PadelSaleForm({
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
  const [venueId, setVenueId] = useState(fixedVenueId ?? "");
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState<SaleEntry[]>([{ flavorId: "", quantitySold: 1, unitPrice: 0 }]);
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

  function addEntry() {
    setEntries((prev) => [...prev, { flavorId: "", quantitySold: 1, unitPrice: 0 }]);
  }

  function removeEntry(idx: number) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateEntry(idx: number, field: keyof SaleEntry, value: string | number) {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  }

  const totalAmount = entries.reduce((s, e) => s + e.quantitySold * e.unitPrice, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!venueId) return alert("Select a venue first");
    setSaving(true);
    await fetch("/api/padel/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueId, saleDate, sales: entries, notes }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-3 sm:p-6">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-semibold text-gray-900">Log Sales</h2>
            {venueName && <p className="text-xs text-gray-400 mt-0.5">{venueName}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Flavors Sold</label>
            <div className="space-y-3">
              {entries.map((entry, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  {flavors.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {flavors.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => updateEntry(idx, "flavorId", f.id)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition ${
                            entry.flavorId === f.id
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
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
                    <p className="text-xs text-gray-400 italic">No flavors configured. Add flavors in Settings first.</p>
                  )}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Qty sold</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={entry.quantitySold}
                        onChange={(e) => updateEntry(idx, "quantitySold", parseInt(e.target.value) || 1)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Price/pcs (IDR)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={entry.unitPrice}
                        onChange={(e) => updateEntry(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {entries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEntry(idx)}
                        className="self-end p-2.5 text-red-400 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addEntry}
              className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus size={14} />
              Add another flavor
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-green-700 font-medium">Total</span>
            <span className="text-lg font-bold text-green-700">
              Rp {totalAmount.toLocaleString("id-ID")}
            </span>
          </div>

          <button
            type="submit"
            disabled={saving || entries.some((e) => !e.flavorId)}
            className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition active:scale-95"
          >
            {saving ? "Saving..." : "Save Sales"}
          </button>
        </form>
      </div>
    </div>
  );
}
