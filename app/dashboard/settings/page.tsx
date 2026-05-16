"use client";

import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Plus, X, Trash2, ChevronDown, ChevronUp, Copy } from "lucide-react";

type Ingredient = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
};

type Variant = {
  id: string;
  size: string;
  sellingPrice: number;
  isActive: boolean;
  product: { id: string; name: string };
  flavor: { id: string; name: string } | null;
  ingredients: Ingredient[];
};

type IngredientRow = { name: string; quantity: string; unit: string; pricePerUnit: string };

type PriceHistoryEntry = {
  id: string;
  ingredientName: string;
  oldPrice: string;
  newPrice: string;
  changedAt: string;
};

type Venue = { id: string; name: string; location: string | null };

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

function cogs(v: Variant): number {
  return v.ingredients.reduce((s, ing) => s + Number(ing.quantity) * Number(ing.pricePerUnit), 0);
}

function margin(v: Variant): number {
  const sp = Number(v.sellingPrice);
  if (!sp) return 0;
  return ((sp - cogs(v)) / sp) * 100;
}

export default function SettingsPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [tab, setTab] = useState<"products" | "venues">("products");

  // Add-variant modal
  const [showAdd, setShowAdd] = useState(false);
  const [newVariant, setNewVariant] = useState({ productName: "", flavorName: "", size: "", sellingPrice: "" });
  const [newIngRows, setNewIngRows] = useState<IngredientRow[]>([{ name: "", quantity: "", unit: "", pricePerUnit: "" }]);
  const [saving, setSaving] = useState(false);

  // Detail modal
  const [selected, setSelected] = useState<Variant | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [newIng, setNewIng] = useState({ name: "", quantity: "", unit: "", pricePerUnit: "" });
  const [editingIng, setEditingIng] = useState<string | null>(null);
  const [ingEdit, setIngEdit] = useState<Partial<Ingredient>>({});
  const [expandedIngredients, setExpandedIngredients] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);

  // Delete product
  const [confirmDelete, setConfirmDelete] = useState<{ productId: string; productName: string } | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  // Venues
  const [newVenue, setNewVenue] = useState({ name: "", location: "", contactName: "", contactPhone: "" });

  const fetchVariants = useCallback(() => {
    fetch("/api/settings/variants").then((r) => r.json()).then(setVariants).catch(() => {});
  }, []);

  const fetchPriceHistory = useCallback((variantId: string) => {
    fetch(`/api/settings/variants/${variantId}/price-history`)
      .then((r) => r.json())
      .then(setPriceHistory)
      .catch(() => {});
  }, []);

  const fetchVenues = useCallback(() => {
    fetch("/api/settings/venues").then((r) => r.json()).then(setVenues).catch(() => {});
  }, []);

  useEffect(() => {
    fetchVariants();
    fetchVenues();
  }, [fetchVariants, fetchVenues]);

  useEffect(() => {
    if (selected) fetchPriceHistory(selected.id);
    else setPriceHistory([]);
  }, [selected, fetchPriceHistory]);

  // Unique product names from variants (+ any that exist in DB) for datalist
  const productNames = [...new Set(variants.map((v) => v.product.name))].sort();
  const flavorNames = (productName: string) =>
    [...new Set(
      variants
        .filter((v) => v.product.name.toLowerCase() === productName.toLowerCase() && v.flavor)
        .map((v) => v.flavor!.name)
    )].sort();

  function closeAdd() {
    setNewVariant({ productName: "", flavorName: "", size: "", sellingPrice: "" });
    setNewIngRows([{ name: "", quantity: "", unit: "", pricePerUnit: "" }]);
    setShowAdd(false);
  }

  function handleDuplicate(v: Variant) {
    setNewVariant({
      productName: v.product.name,
      flavorName: v.flavor?.name ?? "",
      size: v.size,
      sellingPrice: String(v.sellingPrice),
    });
    setNewIngRows(
      v.ingredients.length > 0
        ? v.ingredients.map((i) => ({
            name: i.name,
            quantity: String(i.quantity),
            unit: i.unit,
            pricePerUnit: String(i.pricePerUnit),
          }))
        : [{ name: "", quantity: "", unit: "", pricePerUnit: "" }]
    );
    setShowAdd(true);
  }

  async function addVariant(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ingredients = newIngRows
      .filter((r) => r.name.trim() && r.quantity && r.unit.trim())
      .map((r) => ({
        name: r.name.trim(),
        quantity: parseFloat(r.quantity) || 0,
        unit: r.unit.trim(),
        pricePerUnit: parseFloat(r.pricePerUnit) || 0,
      }));
    const res = await fetch("/api/settings/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: newVariant.productName.trim(),
        flavorName: newVariant.flavorName.trim() || undefined,
        size: newVariant.size.trim(),
        sellingPrice: parseFloat(newVariant.sellingPrice) || 0,
        ingredients,
      }),
    });
    setSaving(false);
    if (res.ok) {
      closeAdd();
      fetchVariants();
    }
  }

  async function updatePrice() {
    if (!selected) return;
    await fetch(`/api/settings/variants/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellingPrice: parseFloat(editPrice) }),
    });
    fetchVariants();
    setSelected((prev) => prev ? { ...prev, sellingPrice: parseFloat(editPrice) } : prev);
  }

  async function toggleActive() {
    if (!selected) return;
    await fetch(`/api/settings/variants/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !selected.isActive }),
    });
    fetchVariants();
    setSelected((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev);
  }

  async function addIngredient(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const res = await fetch(`/api/settings/variants/${selected.id}/ingredients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newIng.name.trim(),
        quantity: parseFloat(newIng.quantity),
        unit: newIng.unit.trim(),
        pricePerUnit: parseFloat(newIng.pricePerUnit),
      }),
    });
    if (res.ok) {
      const ing: Ingredient = await res.json();
      setSelected((prev) => prev ? { ...prev, ingredients: [...prev.ingredients, ing] } : prev);
      setNewIng({ name: "", quantity: "", unit: "", pricePerUnit: "" });
      fetchVariants();
    }
  }

  async function saveIngEdit(ingId: string) {
    if (!selected) return;
    const variantId = selected.id;
    await fetch(`/api/settings/variants/${variantId}/ingredients/${ingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ingEdit),
    });
    setSelected((prev) => {
      if (!prev) return prev;
      return { ...prev, ingredients: prev.ingredients.map((i) => i.id === ingId ? { ...i, ...ingEdit } : i) };
    });
    setEditingIng(null);
    setIngEdit({});
    fetchVariants();
    fetchPriceHistory(variantId);
  }

  async function deleteIngredient(ingId: string) {
    if (!selected) return;
    await fetch(`/api/settings/variants/${selected.id}/ingredients/${ingId}`, { method: "DELETE" });
    setSelected((prev) => prev ? { ...prev, ingredients: prev.ingredients.filter((i) => i.id !== ingId) } : prev);
    fetchVariants();
  }

  async function deleteProduct() {
    if (!confirmDelete) return;
    setDeletingProduct(true);
    await fetch(`/api/settings/products/${confirmDelete.productId}`, { method: "DELETE" });
    setDeletingProduct(false);
    setConfirmDelete(null);
    fetchVariants();
  }

  async function saveVenue(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/settings/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newVenue),
    });
    setNewVenue({ name: "", location: "", contactName: "", contactPhone: "" });
    fetchVenues();
  }

  // Group variants by product, then by flavor
  const grouped = variants.reduce<Record<string, { byFlavor: Record<string, Variant[]>; noFlavor: Variant[] }>>(
    (acc, v) => {
      const pName = v.product.name;
      if (!acc[pName]) acc[pName] = { byFlavor: {}, noFlavor: [] };
      if (v.flavor) {
        const fName = v.flavor.name;
        if (!acc[pName].byFlavor[fName]) acc[pName].byFlavor[fName] = [];
        acc[pName].byFlavor[fName].push(v);
      } else {
        acc[pName].noFlavor.push(v);
      }
      return acc;
    },
    {}
  );

  const selectedCogs = selected ? cogs(selected) : 0;
  const selectedMargin = selected ? margin(selected) : 0;

  return (
    <>
      <Topbar title="Settings" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 max-w-3xl space-y-5">

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {(["products", "venues"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition capitalize ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {t === "products" ? "Products" : "Venues"}
            </button>
          ))}
        </div>

        {/* Products tab */}
        {tab === "products" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Product Variants</h2>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                <Plus size={14} /> Add Variant
              </button>
            </div>

            {Object.keys(grouped).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No variants yet. Click "Add Variant" to get started.</p>
            )}

            {Object.entries(grouped).map(([productName, { byFlavor, noFlavor }]) => {
              const productId = (noFlavor[0] ?? Object.values(byFlavor)[0]?.[0])?.product.id;
              return (
              <div key={productName} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{productName}</h3>
                  {productId && (
                    <button
                      onClick={() => setConfirmDelete({ productId, productName })}
                      className="text-gray-300 hover:text-red-500 transition"
                      title="Delete product"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Unflavored variants */}
                {noFlavor.map((v) => (
                  <VariantCard key={v.id} variant={v} onClick={() => { setSelected(v); setEditPrice(String(v.sellingPrice)); setExpandedIngredients(false); }} onDuplicate={() => handleDuplicate(v)} />
                ))}

                {/* Flavored groups */}
                {Object.entries(byFlavor).map(([flavorName, flavorVariants]) => (
                  <div key={flavorName} className="pl-3 border-l-2 border-gray-200 space-y-2">
                    <p className="text-xs font-medium text-gray-500">{flavorName}</p>
                    {flavorVariants.map((v) => (
                      <VariantCard key={v.id} variant={v} onClick={() => { setSelected(v); setEditPrice(String(v.sellingPrice)); setExpandedIngredients(false); }} onDuplicate={() => handleDuplicate(v)} />
                    ))}
                  </div>
                ))}
              </div>
              );
            })}
          </div>
        )}

        {/* Venues tab */}
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

      {/* Add Variant modal */}
      {showAdd && (() => {
        const newIngTotalCogs = newIngRows.reduce((s, r) => s + (parseFloat(r.quantity) || 0) * (parseFloat(r.pricePerUnit) || 0), 0);
        const sp = parseFloat(newVariant.sellingPrice) || 0;
        const newIngMargin = sp > 0 ? ((sp - newIngTotalCogs) / sp) * 100 : null;

        function updateRow(idx: number, field: keyof IngredientRow, value: string) {
          const v = (field === "quantity" || field === "pricePerUnit") ? value.replace(",", ".") : value;
          setNewIngRows((rows) => rows.map((r, i) => i === idx ? { ...r, [field]: v } : r));
        }
        function removeRow(idx: number) {
          setNewIngRows((rows) => rows.filter((_, i) => i !== idx));
        }
        function onIngKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
          if (e.key === "Enter") {
            e.preventDefault();
            setNewIngRows((r) => [...r, { name: "", quantity: "", unit: "", pricePerUnit: "" }]);
          }
        }

        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
                <h2 className="font-semibold text-gray-800">Add Variant</h2>
                <button onClick={closeAdd}><X size={18} /></button>
              </div>

              <div className="overflow-y-auto flex-1 px-6 py-4">
                <form id="add-variant-form" onSubmit={addVariant} className="space-y-4">
                  <datalist id="dl-products">
                    {productNames.map((n) => <option key={n} value={n} />)}
                  </datalist>
                  <datalist id="dl-flavors">
                    {flavorNames(newVariant.productName).map((n) => <option key={n} value={n} />)}
                  </datalist>
                  <datalist id="dl-units">
                    {["g", "ml", "pcs", "kg", "L", "tbsp", "tsp", "lembar"].map((u) => <option key={u} value={u} />)}
                  </datalist>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Product Name</label>
                    <input
                      required
                      list="dl-products"
                      value={newVariant.productName}
                      onChange={(e) => setNewVariant((p) => ({ ...p, productName: e.target.value }))}
                      placeholder="e.g. Gelato"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Flavor Name (optional)</label>
                      <input
                        list="dl-flavors"
                        value={newVariant.flavorName}
                        onChange={(e) => setNewVariant((p) => ({ ...p, flavorName: e.target.value }))}
                        placeholder="e.g. Vanilla"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Size</label>
                      <input
                        required
                        value={newVariant.size}
                        onChange={(e) => setNewVariant((p) => ({ ...p, size: e.target.value }))}
                        placeholder="e.g. Cup 150ml"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Selling Price (IDR)</label>
                    <input
                      required
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={newVariant.sellingPrice}
                      onChange={(e) => setNewVariant((p) => ({ ...p, sellingPrice: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Ingredients / COGS */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Ingredients / COGS</p>
                      <span className="text-xs text-gray-400">optional</span>
                    </div>

                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_56px_56px_96px_20px] gap-1.5 px-0.5">
                      <p className="text-xs text-gray-400">Name</p>
                      <p className="text-xs text-gray-400">Qty</p>
                      <p className="text-xs text-gray-400">Unit</p>
                      <p className="text-xs text-gray-400 text-right">Price/unit</p>
                      <span />
                    </div>

                    {newIngRows.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_56px_56px_96px_20px] gap-1.5 items-center">
                        <input
                          value={row.name}
                          onChange={(e) => updateRow(idx, "name", e.target.value)}
                          onKeyDown={onIngKeyDown}
                          placeholder="Tepung terigu"
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min="0"
                          value={row.quantity}
                          onChange={(e) => updateRow(idx, "quantity", e.target.value)}
                          onKeyDown={onIngKeyDown}
                          placeholder="0"
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          list="dl-units"
                          value={row.unit}
                          onChange={(e) => updateRow(idx, "unit", e.target.value)}
                          onKeyDown={onIngKeyDown}
                          placeholder="g"
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min="0"
                          value={row.pricePerUnit}
                          onChange={(e) => updateRow(idx, "pricePerUnit", e.target.value)}
                          onKeyDown={onIngKeyDown}
                          placeholder="0"
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          disabled={newIngRows.length === 1}
                          className="text-gray-300 hover:text-red-400 disabled:invisible transition"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => setNewIngRows((r) => [...r, { name: "", quantity: "", unit: "", pricePerUnit: "" }])}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
                    >
                      <Plus size={13} /> Add Ingredient
                    </button>

                    {/* Live COGS summary */}
                    {newIngTotalCogs > 0 && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-xs text-gray-400">Total COGS</p>
                          <p className="text-sm font-semibold text-gray-800">{fmt(newIngTotalCogs)}</p>
                        </div>
                        <div className={`rounded-lg px-3 py-2 ${newIngMargin !== null && newIngMargin >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                          <p className="text-xs text-gray-400">Gross Margin</p>
                          <p className={`text-sm font-semibold ${newIngMargin !== null && newIngMargin >= 0 ? "text-green-700" : "text-red-600"}`}>
                            {newIngMargin !== null ? `${newIngMargin.toFixed(1)}%` : "—"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              </div>

              <div className="flex gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
                <button type="button" onClick={closeAdd} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" form="add-variant-form" disabled={saving} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60">
                  {saving ? "Saving…" : "Add Variant"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete product confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                <Trash2 size={16} className="text-red-500" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Delete product?</h2>
                <p className="text-sm text-gray-500 mt-1">
                  This will permanently delete <span className="font-medium text-gray-800">{confirmDelete.productName}</span> and all its variants and ingredients. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={deleteProduct}
                disabled={deletingProduct}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-60"
              >
                {deletingProduct ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variant detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{selected.product.name}</p>
                  <h2 className="font-semibold text-gray-900 text-lg">
                    {selected.flavor ? `${selected.flavor.name} – ` : ""}{selected.size}
                  </h2>
                  {!selected.isActive && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                  )}
                </div>
                <button onClick={() => setSelected(null)}><X size={18} /></button>
              </div>

              {/* Selling price (editable) */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <label className="text-xs text-gray-500">Selling Price (IDR)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={updatePrice}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* COGS summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400">Total COGS</p>
                  <p className="font-semibold text-gray-800 text-sm">{fmt(selectedCogs)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400">Selling Price</p>
                  <p className="font-semibold text-gray-800 text-sm">{fmt(Number(selected.sellingPrice))}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${selectedMargin >= 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                  <p className="text-xs text-gray-400">Gross Margin</p>
                  <p className={`font-semibold text-sm ${selectedMargin >= 0 ? "text-green-700" : "text-red-700"}`}>{selectedMargin.toFixed(1)}%</p>
                </div>
              </div>

              {/* Ingredients */}
              <div className="space-y-2">
                <button
                  onClick={() => setExpandedIngredients((p) => !p)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 w-full"
                >
                  Ingredients / COGS Breakdown
                  {expandedIngredients ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span className="text-xs text-gray-400 font-normal ml-auto">{selected.ingredients.length} items</span>
                </button>

                {(expandedIngredients || selected.ingredients.length === 0) && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Ingredient</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">Qty</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Unit</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">Price/Unit</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">Total</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selected.ingredients.map((ing) => (
                          editingIng === ing.id ? (
                            <tr key={ing.id} className="bg-blue-50">
                              <td className="px-2 py-1">
                                <input
                                  value={ingEdit.name ?? ing.name}
                                  onChange={(e) => setIngEdit((p) => ({ ...p, name: e.target.value }))}
                                  className="w-full border border-blue-300 rounded px-2 py-1 text-xs"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="number"
                                  value={ingEdit.quantity ?? ing.quantity}
                                  onChange={(e) => setIngEdit((p) => ({ ...p, quantity: parseFloat(e.target.value) }))}
                                  className="w-16 border border-blue-300 rounded px-2 py-1 text-xs text-right"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  value={ingEdit.unit ?? ing.unit}
                                  onChange={(e) => setIngEdit((p) => ({ ...p, unit: e.target.value }))}
                                  className="w-16 border border-blue-300 rounded px-2 py-1 text-xs"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="number"
                                  value={ingEdit.pricePerUnit ?? ing.pricePerUnit}
                                  onChange={(e) => setIngEdit((p) => ({ ...p, pricePerUnit: parseFloat(e.target.value) }))}
                                  className="w-24 border border-blue-300 rounded px-2 py-1 text-xs text-right"
                                />
                              </td>
                              <td className="px-3 py-2 text-right text-gray-500">
                                {fmt(Number(ingEdit.quantity ?? ing.quantity) * Number(ingEdit.pricePerUnit ?? ing.pricePerUnit))}
                              </td>
                              <td className="px-2 py-1">
                                <div className="flex gap-1">
                                  <button onClick={() => saveIngEdit(ing.id)} className="text-xs text-blue-600 font-medium hover:underline">Save</button>
                                  <button onClick={() => { setEditingIng(null); setIngEdit({}); }} className="text-xs text-gray-400 hover:underline">✕</button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <tr
                              key={ing.id}
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => { setEditingIng(ing.id); setIngEdit({}); }}
                            >
                              <td className="px-3 py-2 text-gray-800">{ing.name}</td>
                              <td className="px-3 py-2 text-right text-gray-600">{Number(ing.quantity)}</td>
                              <td className="px-3 py-2 text-gray-600">{ing.unit}</td>
                              <td className="px-3 py-2 text-right text-gray-600">{fmt(Number(ing.pricePerUnit))}</td>
                              <td className="px-3 py-2 text-right font-medium text-gray-800">{fmt(Number(ing.quantity) * Number(ing.pricePerUnit))}</td>
                              <td className="px-3 py-2">
                                <button onClick={(e) => { e.stopPropagation(); deleteIngredient(ing.id); }} className="text-red-400 hover:text-red-600">
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          )
                        ))}

                        {/* Add ingredient row */}
                        <tr className="bg-gray-50">
                          <td className="px-2 py-1">
                            <input
                              value={newIng.name}
                              onChange={(e) => setNewIng((p) => ({ ...p, name: e.target.value }))}
                              placeholder="Ingredient"
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              value={newIng.quantity}
                              onChange={(e) => setNewIng((p) => ({ ...p, quantity: e.target.value }))}
                              placeholder="Qty"
                              className="w-16 border border-gray-300 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              value={newIng.unit}
                              onChange={(e) => setNewIng((p) => ({ ...p, unit: e.target.value }))}
                              placeholder="ml"
                              className="w-16 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              value={newIng.pricePerUnit}
                              onChange={(e) => setNewIng((p) => ({ ...p, pricePerUnit: e.target.value }))}
                              placeholder="Price/unit"
                              className="w-24 border border-gray-300 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td />
                          <td className="px-2 py-1">
                            <button
                              onClick={(e) => { e.preventDefault(); addIngredient(e as unknown as React.FormEvent); }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Plus size={15} />
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Price history */}
              {priceHistory.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Price History</p>
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                    {priceHistory.map((h) => (
                      <div key={h.id} className="flex items-center justify-between px-3 py-2 text-xs">
                        <span className="font-medium text-gray-800">{h.ingredientName}</span>
                        <span className="text-gray-500">
                          {fmt(Number(h.oldPrice))} → {fmt(Number(h.newPrice))}
                        </span>
                        <span className="text-gray-400 shrink-0 ml-3">
                          {new Date(h.changedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deactivate toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-sm text-gray-600">{selected.isActive ? "Active" : "Inactive"}</span>
                <button
                  onClick={toggleActive}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${selected.isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}
                >
                  {selected.isActive ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function VariantCard({ variant, onClick, onDuplicate }: { variant: Variant; onClick: () => void; onDuplicate: () => void }) {
  const totalCogs = cogs(variant);
  const grossMargin = margin(variant);
  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  return (
    <div
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-200 px-4 py-3 hover:border-blue-300 hover:shadow-sm transition flex items-center justify-between gap-4 cursor-pointer group"
    >
      <div className="min-w-0">
        <p className="font-medium text-gray-900 text-sm">{variant.size}</p>
        {!variant.isActive && <span className="text-xs text-gray-400">(inactive)</span>}
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500 shrink-0">
        <div className="text-right">
          <p className="text-gray-400">Price</p>
          <p className="font-medium text-gray-700">{fmt(Number(variant.sellingPrice))}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-400">COGS</p>
          <p className="font-medium text-gray-700">{totalCogs > 0 ? fmt(totalCogs) : "—"}</p>
        </div>
        <div className={`text-right ${grossMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
          <p className="text-gray-400">Margin</p>
          <p className="font-medium">{totalCogs > 0 ? `${grossMargin.toFixed(1)}%` : "—"}</p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          title="Duplicate variant"
          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition"
        >
          <Copy size={13} /> Duplicate
        </button>
      </div>
    </div>
  );
}
