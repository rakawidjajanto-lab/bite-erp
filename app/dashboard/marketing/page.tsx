"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { formatIDR } from "@/lib/formatters/currency";
import { Plus, Trash2, X, Megaphone } from "lucide-react";

type Product = { id: string; name: string; unitCost: number; flavors: { id: string; name: string }[] };
type GiveawayItem = { id: string; quantity: number; unitCost: string; product: { name: string }; flavor: { name: string; colorHex: string | null } | null };
type Giveaway = { id: string; date: string; recipient: string; purpose: string; notes: string | null; items: GiveawayItem[] };

const PURPOSE_LABELS: Record<string, string> = {
  ENDORSEMENT: "Endorsement",
  SAMPLING: "Sampling",
  EVENT: "Event",
  OTHER: "Other",
};

const PURPOSE_COLORS: Record<string, string> = {
  ENDORSEMENT: "bg-purple-100 text-purple-700",
  SAMPLING: "bg-blue-100 text-blue-700",
  EVENT: "bg-orange-100 text-orange-700",
  OTHER: "bg-gray-100 text-gray-600",
};

type FormItem = { productId: string; flavorId: string; quantity: number };

export default function MarketingPage() {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    recipient: "",
    purpose: "ENDORSEMENT",
    notes: "",
  });
  const [items, setItems] = useState<FormItem[]>([{ productId: "", flavorId: "", quantity: 1 }]);

  const fetchData = () => {
    fetch("/api/marketing/giveaways").then((r) => r.json()).then(setGiveaways).catch(() => {});
    fetch("/api/settings/products").then((r) => r.json()).then(setProducts).catch(() => {});
  };

  useEffect(() => { fetchData(); }, []);

  function addItem() {
    setItems((prev) => [...prev, { productId: "", flavorId: "", quantity: 1 }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof FormItem, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        if (field === "productId") return { ...item, productId: value as string, flavorId: "" };
        return { ...item, [field]: value };
      })
    );
  }

  function giveawayTotal(g: Giveaway) {
    return g.items.reduce((s, i) => s + i.quantity * parseFloat(String(i.unitCost)), 0);
  }

  function formTotal() {
    return items.reduce((s, item) => {
      const prod = products.find((p) => p.id === item.productId);
      return s + item.quantity * (prod?.unitCost ?? 0);
    }, 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.some((i) => !i.productId)) return alert("Select a product for each item.");
    setSaving(true);
    await fetch("/api/marketing/giveaways", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, items: items.map((i) => ({ productId: i.productId, flavorId: i.flavorId || undefined, quantity: i.quantity })) }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ date: new Date().toISOString().split("T")[0], recipient: "", purpose: "ENDORSEMENT", notes: "" });
    setItems([{ productId: "", flavorId: "", quantity: 1 }]);
    fetchData();
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <>
      <Topbar title="Marketing" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-5 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Giveaways & Endorsements</h2>
            <p className="text-sm text-gray-500">Track free items given for marketing purposes</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition min-h-[44px]"
          >
            <Plus size={15} />
            Log Giveaway
          </button>
        </div>

        {giveaways.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
              <Megaphone size={20} className="text-gray-400" />
            </div>
            <p className="font-medium mb-1">No giveaways logged yet</p>
            <p className="text-sm">Log free items given for endorsements, sampling, or events.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {giveaways.map((g) => (
              <div key={g.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between bg-gray-50">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{g.recipient}</p>
                    <p className="text-xs text-gray-400">{formatDate(g.date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PURPOSE_COLORS[g.purpose] ?? "bg-gray-100 text-gray-600"}`}>
                      {PURPOSE_LABELS[g.purpose] ?? g.purpose}
                    </span>
                    <p className="text-sm font-bold text-red-500">−{formatIDR(giveawayTotal(g))}</p>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {g.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {item.flavor?.colorHex && (
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.flavor.colorHex }} />
                        )}
                        <span className="text-sm text-gray-800">
                          {item.product.name}{item.flavor ? ` – ${item.flavor.name}` : ""}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-700">{item.quantity} pcs</p>
                        <p className="text-xs text-gray-400">@ {formatIDR(parseFloat(String(item.unitCost)))}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {g.notes && <p className="px-4 pb-3 pt-1 text-xs text-gray-400 italic">{g.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-3 sm:p-6">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-semibold text-gray-900">Log Giveaway</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Purpose</label>
                  <select
                    value={form.purpose}
                    onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ENDORSEMENT">Endorsement</option>
                    <option value="SAMPLING">Sampling</option>
                    <option value="EVENT">Event</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Recipient / Influencer Name</label>
                <input
                  required
                  value={form.recipient}
                  onChange={(e) => setForm((f) => ({ ...f, recipient: e.target.value }))}
                  placeholder="e.g. @username or Event Name"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-2 block font-medium">Items Given</label>
                <div className="space-y-3">
                  {items.map((item, idx) => {
                    const selectedProduct = products.find((p) => p.id === item.productId);
                    return (
                      <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Product</label>
                            <select
                              value={item.productId}
                              onChange={(e) => updateItem(idx, "productId", e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select...</option>
                              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </div>
                          {selectedProduct && selectedProduct.flavors.length > 0 && (
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Flavor</label>
                              <select
                                value={item.flavorId}
                                onChange={(e) => updateItem(idx, "flavorId", e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">All flavors</option>
                                {selectedProduct.flavors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1 block">Qty (pcs)</label>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          {selectedProduct && (
                            <p className="text-xs text-gray-400 pb-2">
                              @ {formatIDR(selectedProduct.unitCost)}/pcs
                            </p>
                          )}
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus size={14} />
                  Add item
                </button>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none"
                />
              </div>

              {formTotal() > 0 && (
                <div className="bg-red-50 rounded-xl px-4 py-3 flex justify-between items-center">
                  <span className="text-sm text-red-700 font-medium">Inventory Value Given Away</span>
                  <span className="text-lg font-bold text-red-700">−{formatIDR(formTotal())}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {saving ? "Saving..." : "Log Giveaway"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
