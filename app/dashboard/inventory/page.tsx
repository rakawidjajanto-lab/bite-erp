"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Plus, AlertTriangle } from "lucide-react";

type InventoryItem = {
  id: string;
  quantity: number;
  unit: string;
  reorderPoint: number;
  product: { name: string };
  flavor: { name: string; colorHex: string | null } | null;
};

type Product = { id: string; name: string; flavors: { id: string; name: string }[] };

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ productId: "", flavorId: "", quantityChange: 0, movementType: "RESTOCK", notes: "" });
  const [saving, setSaving] = useState(false);

  const fetchInventory = () => {
    fetch("/api/inventory").then((r) => r.json()).then(setInventory).catch(() => {});
    fetch("/api/settings/products").then((r) => r.json()).then(setProducts).catch(() => {});
  };

  useEffect(() => { fetchInventory(); }, []);

  const selectedProduct = products.find((p) => p.id === form.productId);
  const lowStock = inventory.filter((i) => i.quantity <= i.reorderPoint && i.reorderPoint > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowForm(false);
    fetchInventory();
  }

  return (
    <>
      <Topbar title="Inventory" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Stock Levels</h2>
            {lowStock.length > 0 && (
              <p className="text-sm text-amber-600 flex items-center gap-1 mt-0.5">
                <AlertTriangle size={14} />
                {lowStock.length} item(s) at or below reorder point
              </p>
            )}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition min-h-[44px]"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Adjust Stock</span>
            <span className="sm:hidden">Adjust</span>
          </button>
        </div>

        {inventory.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
            No inventory tracked yet. Add a stock adjustment to start.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Product / Flavor</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Stock</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Reorder At</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {inventory.map((item) => {
                    const isLow = item.reorderPoint > 0 && item.quantity <= item.reorderPoint;
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 ${isLow ? "bg-amber-50" : ""}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {item.flavor?.colorHex && (
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.flavor.colorHex }} />
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{item.product.name}</p>
                              {item.flavor && <p className="text-xs text-gray-400">{item.flavor.name}</p>}
                            </div>
                          </div>
                        </td>
                        <td className={`py-3 px-4 text-right font-bold ${isLow ? "text-amber-600" : "text-gray-900"}`}>
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-400 text-xs">
                          {item.reorderPoint > 0 ? item.reorderPoint : "—"}
                        </td>
                        <td className="py-3 px-4">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                              <AlertTriangle size={11} /> Low
                            </span>
                          ) : (
                            <span className="text-xs text-green-600 font-medium">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden space-y-2">
              {inventory.map((item) => {
                const isLow = item.reorderPoint > 0 && item.quantity <= item.reorderPoint;
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border px-4 py-3 flex items-center justify-between ${isLow ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.flavor?.colorHex && (
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.flavor.colorHex }} />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                        {item.flavor && <p className="text-xs text-gray-400">{item.flavor.name}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${isLow ? "text-amber-600" : "text-gray-900"}`}>
                        {item.quantity} {item.unit}
                      </p>
                      {isLow ? (
                        <span className="text-xs text-amber-600 font-medium">Low stock</span>
                      ) : (
                        <span className="text-xs text-green-600">OK</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <h3 className="font-semibold text-gray-900">Adjust Stock</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Product</label>
                <select
                  value={form.productId}
                  onChange={(e) => setForm((p) => ({ ...p, productId: e.target.value, flavorId: "" }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  required
                >
                  <option value="">Select product...</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {selectedProduct && selectedProduct.flavors.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Flavor</label>
                  <select
                    value={form.flavorId}
                    onChange={(e) => setForm((p) => ({ ...p, flavorId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  >
                    <option value="">No specific flavor</option>
                    {selectedProduct.flavors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Movement Type</label>
                <select
                  value={form.movementType}
                  onChange={(e) => setForm((p) => ({ ...p, movementType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none min-h-[44px]"
                >
                  <option value="RESTOCK">Restock (+)</option>
                  <option value="SALE">Sale (-)</option>
                  <option value="WASTE">Waste (-)</option>
                  <option value="ADJUSTMENT">Manual Adjustment</option>
                  <option value="PADEL_DELIVERY">Padel Delivery (-)</option>
                  <option value="RND_USAGE">R&D Usage (-)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Quantity Change (negative = reduction)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.quantityChange}
                  onChange={(e) => setForm((p) => ({ ...p, quantityChange: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-3 text-sm font-medium hover:bg-gray-50 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
