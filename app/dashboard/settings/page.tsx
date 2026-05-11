"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Plus, Palette } from "lucide-react";

type Flavor = { id: string; name: string; colorHex: string | null; product: { name: string } };
type Product = { id: string; name: string; sku: string };
type Venue = { id: string; name: string; location: string | null };

const PRESET_COLORS = [
  "#f87171", "#fb923c", "#fbbf24", "#a3e635",
  "#34d399", "#22d3ee", "#818cf8", "#e879f9",
  "#f472b6", "#94a3b8",
];

export default function SettingsPage() {
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [tab, setTab] = useState<"flavors" | "products" | "venues">("flavors");

  const TAB_LABELS: Record<"flavors" | "products" | "venues", string> = {
    flavors: "Flavors",
    products: "Products",
    venues: "Add Venue",
  };

  const [newFlavor, setNewFlavor] = useState({ name: "", productId: "", colorHex: "#818cf8" });
  const [newProduct, setNewProduct] = useState({ name: "", sku: "", unitCost: 0, sellingPrice: 0 });
  const [newVenue, setNewVenue] = useState({ name: "", location: "", contactName: "", contactPhone: "" });

  const fetchAll = () => {
    fetch("/api/settings/flavors").then((r) => r.json()).then(setFlavors).catch(() => {});
    fetch("/api/settings/products").then((r) => r.json()).then(setProducts).catch(() => {});
    fetch("/api/settings/venues").then((r) => r.json()).then(setVenues).catch(() => {});
  };

  useEffect(() => { fetchAll(); }, []);

  async function saveFlavor(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/settings/flavors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newFlavor) });
    setNewFlavor({ name: "", productId: "", colorHex: "#818cf8" });
    fetchAll();
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/settings/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newProduct) });
    setNewProduct({ name: "", sku: "", unitCost: 0, sellingPrice: 0 });
    fetchAll();
  }

  async function saveVenue(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/settings/venues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newVenue) });
    setNewVenue({ name: "", location: "", contactName: "", contactPhone: "" });
    fetchAll();
  }

  return (
    <>
      <Topbar title="Settings" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 max-w-2xl space-y-5 sm:space-y-6">
        <div className="flex gap-2 border-b border-gray-200">
          {(["flavors", "products", "venues"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {tab === "flavors" && (
          <div className="space-y-4">
            <form onSubmit={saveFlavor} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <h3 className="font-semibold text-gray-800 text-sm">Add Flavor</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Flavor Name</label>
                  <input
                    required
                    value={newFlavor.name}
                    onChange={(e) => setNewFlavor((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Matcha, Vanilla..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Product</label>
                  <select
                    value={newFlavor.productId}
                    onChange={(e) => setNewFlavor((p) => ({ ...p, productId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select product...</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-2 block flex items-center gap-1">
                  <Palette size={12} />
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewFlavor((p) => ({ ...p, colorHex: c }))}
                      className={`w-7 h-7 rounded-full transition ${newFlavor.colorHex === c ? "ring-2 ring-offset-2 ring-blue-500 scale-110" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <button type="submit" className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                <Plus size={14} /> Add Flavor
              </button>
            </form>

            <div className="space-y-2">
              {flavors.map((f) => (
                <div key={f.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {f.colorHex && <span className="w-4 h-4 rounded-full" style={{ backgroundColor: f.colorHex }} />}
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{f.name}</p>
                      <p className="text-xs text-gray-400">{f.product?.name ?? "No product"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "products" && (
          <div className="space-y-4">
            <form onSubmit={saveProduct} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <h3 className="font-semibold text-gray-800 text-sm">Add Product</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Product Name</label>
                  <input required value={newProduct.name} onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Protein Gelato" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">SKU</label>
                  <input required value={newProduct.sku} onChange={(e) => setNewProduct((p) => ({ ...p, sku: e.target.value }))} placeholder="e.g. PG-001" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Unit Cost (IDR)</label>
                  <input type="number" inputMode="numeric" value={newProduct.unitCost} onChange={(e) => setNewProduct((p) => ({ ...p, unitCost: parseFloat(e.target.value) || 0 }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Selling Price (IDR)</label>
                  <input type="number" inputMode="numeric" value={newProduct.sellingPrice} onChange={(e) => setNewProduct((p) => ({ ...p, sellingPrice: parseFloat(e.target.value) || 0 }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <button type="submit" className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                <Plus size={14} /> Add Product
              </button>
            </form>
            <div className="space-y-2">
              {products.map((p) => (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                  <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                  <p className="text-xs text-gray-400">SKU: {p.sku}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "venues" && (
          <div className="space-y-4">
            <form onSubmit={saveVenue} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <h3 className="font-semibold text-gray-800 text-sm">Add Padel Venue</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Venue Name</label>
                  <input required value={newVenue.name} onChange={(e) => setNewVenue((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Padel Arena Jakarta" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Location</label>
                  <input value={newVenue.location} onChange={(e) => setNewVenue((p) => ({ ...p, location: e.target.value }))} placeholder="Area / address" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Contact Name</label>
                  <input value={newVenue.contactName} onChange={(e) => setNewVenue((p) => ({ ...p, contactName: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Contact Phone</label>
                  <input value={newVenue.contactPhone} onChange={(e) => setNewVenue((p) => ({ ...p, contactPhone: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <button type="submit" className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                <Plus size={14} /> Add Venue
              </button>
            </form>
            <div className="space-y-2">
              {venues.map((v) => (
                <div key={v.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                  <p className="font-medium text-gray-900 text-sm">{v.name}</p>
                  {v.location && <p className="text-xs text-gray-400">{v.location}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
