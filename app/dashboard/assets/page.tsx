"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { formatIDR } from "@/lib/formatters/currency";
import { Plus, X, Landmark, TrendingDown, TrendingUp } from "lucide-react";

type PhysicalAsset = {
  id: string;
  name: string;
  category: string;
  purchaseDate: string;
  purchasePrice: string;
  currentValue: string;
  notes: string | null;
  createdAt: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  MACHINE: "Machine",
  FREEZER: "Freezer",
  FURNITURE: "Furniture",
  VEHICLE: "Vehicle",
  ELECTRONICS: "Electronics",
  OTHER: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  MACHINE: "bg-blue-100 text-blue-700",
  FREEZER: "bg-cyan-100 text-cyan-700",
  FURNITURE: "bg-amber-100 text-amber-700",
  VEHICLE: "bg-purple-100 text-purple-700",
  ELECTRONICS: "bg-green-100 text-green-700",
  OTHER: "bg-gray-100 text-gray-600",
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<PhysicalAsset[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "MACHINE",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchasePrice: "",
    currentValue: "",
    notes: "",
  });

  const fetchAssets = () => {
    fetch("/api/assets").then((r) => r.json()).then(setAssets).catch(() => {});
  };

  useEffect(() => { fetchAssets(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        purchasePrice: parseFloat(form.purchasePrice),
        currentValue: parseFloat(form.currentValue),
      }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ name: "", category: "MACHINE", purchaseDate: new Date().toISOString().split("T")[0], purchasePrice: "", currentValue: "", notes: "" });
    fetchAssets();
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  const totalPurchase = assets.reduce((s, a) => s + parseFloat(a.purchasePrice), 0);
  const totalCurrent = assets.reduce((s, a) => s + parseFloat(a.currentValue), 0);
  const totalDepreciation = totalPurchase - totalCurrent;

  return (
    <>
      <Topbar title="Assets" subtitle="Physical equipment & long-term investments" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-5 max-w-3xl">
        {/* Summary row */}
        {assets.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
              <p className="text-xs text-gray-500 mb-1">Total Purchase Value</p>
              <p className="text-base sm:text-lg font-bold text-gray-900">{formatIDR(totalPurchase)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
              <p className="text-xs text-gray-500 mb-1">Current Est. Value</p>
              <p className="text-base sm:text-lg font-bold text-blue-700">{formatIDR(totalCurrent)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
              <p className="text-xs text-gray-500 mb-1">Total Depreciation</p>
              <p className={`text-base sm:text-lg font-bold ${totalDepreciation > 0 ? "text-red-500" : "text-green-600"}`}>
                {totalDepreciation >= 0 ? "−" : "+"}{formatIDR(Math.abs(totalDepreciation))}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Physical Assets</h2>
            <p className="text-sm text-gray-500">Machines, freezers, furniture, vehicles</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition min-h-[44px]"
          >
            <Plus size={15} />
            Add Asset
          </button>
        </div>

        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
              <Landmark size={20} className="text-gray-400" />
            </div>
            <p className="font-medium mb-1">No assets recorded yet</p>
            <p className="text-sm">Track machines, freezers, furniture, and vehicles here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assets.map((asset) => {
              const purchase = parseFloat(asset.purchasePrice);
              const current = parseFloat(asset.currentValue);
              const change = current - purchase;
              return (
                <div key={asset.id} className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">{asset.name}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[asset.category] ?? "bg-gray-100 text-gray-600"}`}>
                          {CATEGORY_LABELS[asset.category] ?? asset.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">Purchased {formatDate(asset.purchaseDate)}</p>
                      {asset.notes && <p className="text-xs text-gray-400 italic mt-1">{asset.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatIDR(current)}</p>
                      <p className="text-xs text-gray-400">est. value</p>
                      {change !== 0 && (
                        <div className={`flex items-center justify-end gap-0.5 text-xs mt-0.5 ${change < 0 ? "text-red-400" : "text-green-500"}`}>
                          {change < 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                          <span>{formatIDR(Math.abs(change))}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                    <span>Purchase price: {formatIDR(purchase)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-3 sm:p-6">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-semibold text-gray-900">Add Asset</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Asset Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Taylor C602 Gelato Machine"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MACHINE">Machine</option>
                    <option value="FREEZER">Freezer</option>
                    <option value="FURNITURE">Furniture</option>
                    <option value="VEHICLE">Vehicle</option>
                    <option value="ELECTRONICS">Electronics</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Purchase Date</label>
                  <input
                    type="date"
                    required
                    value={form.purchaseDate}
                    onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Purchase Price (IDR)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    required
                    value={form.purchasePrice}
                    onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                    placeholder="15000000"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Current Est. Value (IDR)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    required
                    value={form.currentValue}
                    onChange={(e) => setForm((f) => ({ ...f, currentValue: e.target.value }))}
                    placeholder="12000000"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Serial number, location, supplier..."
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {saving ? "Saving..." : "Add Asset"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
