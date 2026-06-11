"use client";

import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { MonthYearPicker, monthBounds } from "@/components/filters/MonthYearPicker";
import { Plus, AlertTriangle, Upload, X, Download, Package } from "lucide-react";
import { parseInventoryCsv, type ParsedInventoryRow } from "@/lib/import/inventory-parser";
import { formatIDR } from "@/lib/formatters/currency";

type InventoryItem = {
  id: string;
  quantity: number;
  unit: string;
  reorderPoint: number;
  product: { name: string };
  flavor: { name: string; colorHex: string | null } | null;
};

type Movement = {
  id: string;
  movementType: string;
  quantityChange: number;
  notes: string | null;
  createdAt: string;
  product: { name: string };
  flavor: { name: string; colorHex: string | null } | null;
};

type Product = { id: string; name: string; flavors: { id: string; name: string }[] };

type SupplyItem = {
  id: string;
  name: string;
  unit: string;
  gramsPerUnit: string;
  stock: string;
  pricePerUnit: string;
};

const MOVEMENT_LABELS: Record<string, string> = {
  RESTOCK: "Restock",
  SALE: "Sale",
  WASTE: "Waste",
  ADJUSTMENT: "Adjustment",
  PADEL_DELIVERY: "Padel",
  RND_USAGE: "R&D",
  MARKETING_GIVEAWAY: "Marketing",
};

const MOVEMENT_COLORS: Record<string, string> = {
  RESTOCK: "bg-green-100 text-green-700",
  SALE: "bg-blue-100 text-blue-700",
  WASTE: "bg-red-100 text-red-600",
  ADJUSTMENT: "bg-gray-100 text-gray-600",
  PADEL_DELIVERY: "bg-purple-100 text-purple-700",
  RND_USAGE: "bg-orange-100 text-orange-700",
  MARKETING_GIVEAWAY: "bg-pink-100 text-pink-700",
};

const EMPTY_SUPPLY_FORM = { name: "", unit: "", gramsPerUnit: "1", stock: "0", pricePerUnit: "0" };

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ productId: "", flavorId: "", quantityChange: 0, movementType: "RESTOCK", notes: "" });
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<ParsedInventoryRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; failed: number } | null>(null);

  // Supply items state
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([]);
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [supplyForm, setSupplyForm] = useState(EMPTY_SUPPLY_FORM);
  const [savingSupply, setSavingSupply] = useState(false);

  const fetchInventory = useCallback(() => {
    fetch("/api/inventory").then((r) => r.json()).then(setInventory).catch(() => {});
    fetch("/api/settings/products").then((r) => r.json()).then(setProducts).catch(() => {});
    const { from, to } = monthBounds(year, month);
    const q = from ? `?from=${from}&to=${to}` : "";
    fetch(`/api/inventory/movements${q}`).then((r) => r.json()).then(setMovements).catch(() => {});
  }, [year, month]);

  const fetchSupplyItems = useCallback(() => {
    fetch("/api/supply-items").then((r) => r.json()).then(setSupplyItems).catch(() => {});
  }, []);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);
  useEffect(() => { fetchSupplyItems(); }, [fetchSupplyItems]);

  const INVENTORY_TEMPLATE =
    "data:text/csv;charset=utf-8,productName,quantity,unit,costPrice,notes\n" +
    "Vanilla Gelato,50,pcs,15000,January restock\n" +
    "Chocolate Base,20,kg,45000,\n" +
    "Matcha Powder,5,kg,120000,Premium grade\n";

  function handleInventoryFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportRows(parseInventoryCsv(ev.target!.result as ArrayBuffer, file.name));
      setImportResult(null);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  async function handleInventoryImport() {
    if (!importRows.length) return;
    setImporting(true);
    const res = await fetch("/api/inventory/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: importRows }),
    });
    setImportResult(await res.json());
    setImporting(false);
    fetchInventory();
  }

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

  async function handleSupplySubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingSupply(true);
    await fetch("/api/supply-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: supplyForm.name,
        unit: supplyForm.unit,
        gramsPerUnit: parseFloat(supplyForm.gramsPerUnit) || 1,
        stock: parseFloat(supplyForm.stock) || 0,
        pricePerUnit: parseFloat(supplyForm.pricePerUnit) || 0,
      }),
    });
    setSavingSupply(false);
    setShowSupplyModal(false);
    setSupplyForm(EMPTY_SUPPLY_FORM);
    fetchSupplyItems();
  }

  return (
    <>
      <Topbar title="Inventory" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">

        {/* ── Product Inventory ── */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Stock Levels</h2>
              {lowStock.length > 0 && (
                <p className="text-sm text-amber-600 flex items-center gap-1 mt-0.5">
                  <AlertTriangle size={14} />
                  {lowStock.length} item(s) at or below reorder point
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <MonthYearPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
              <button
                onClick={() => { setShowImport(true); setImportRows([]); setImportResult(null); }}
                className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition min-h-[44px]"
              >
                <Upload size={15} />
                <span className="hidden sm:inline">Import CSV</span>
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition min-h-[44px]"
              >
                <Plus size={15} />
                <span className="hidden sm:inline">Adjust Stock</span>
                <span className="sm:hidden">Adjust</span>
              </button>
            </div>
          </div>

          {inventory.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
              No inventory tracked yet. Add a stock adjustment to start.
            </div>
          ) : (
            <>
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

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">
              {year && month
                ? `Movements — ${new Date(year, month - 1).toLocaleString("default", { month: "long" })} ${year}`
                : "All Movements"}
            </h3>
            {movements.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
                No movements recorded for this month.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-2.5 px-4 text-gray-500 font-medium text-xs">Date</th>
                      <th className="text-left py-2.5 px-4 text-gray-500 font-medium text-xs">Product</th>
                      <th className="text-left py-2.5 px-4 text-gray-500 font-medium text-xs">Type</th>
                      <th className="text-right py-2.5 px-4 text-gray-500 font-medium text-xs">Qty</th>
                      <th className="text-left py-2.5 px-4 text-gray-500 font-medium text-xs hidden sm:table-cell">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {movements.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-4 text-gray-400 text-xs whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </td>
                        <td className="py-2.5 px-4">
                          <p className="text-sm text-gray-900">{m.product.name}</p>
                          {m.flavor && <p className="text-xs text-gray-400">{m.flavor.name}</p>}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${MOVEMENT_COLORS[m.movementType] ?? "bg-gray-100 text-gray-600"}`}>
                            {MOVEMENT_LABELS[m.movementType] ?? m.movementType}
                          </span>
                        </td>
                        <td className={`py-2.5 px-4 text-right font-semibold text-xs ${m.quantityChange >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {m.quantityChange >= 0 ? "+" : ""}{m.quantityChange}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-gray-400 hidden sm:table-cell max-w-[160px] truncate">
                          {m.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Supply Items ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package size={18} className="text-gray-500" /> Supply Items
              </h2>
              <p className="text-sm text-gray-500">Raw materials used in R&D projects</p>
            </div>
            <button
              onClick={() => { setShowSupplyModal(true); setSupplyForm(EMPTY_SUPPLY_FORM); }}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition min-h-[44px]"
            >
              <Plus size={15} /> Add Item
            </button>
          </div>

          {supplyItems.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
              No supply items yet. Add raw materials to track R&D usage.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs">Name</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs">Unit</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs">Grams/Unit</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs">Stock</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs">Price/Unit</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {supplyItems.map((item) => {
                    const stock = parseFloat(item.stock);
                    const price = parseFloat(item.pricePerUnit);
                    const totalValue = stock * price;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                        <td className="py-3 px-4 text-gray-500">{item.unit}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{parseFloat(item.gramsPerUnit).toLocaleString("id-ID")}</td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          {parseFloat(item.stock).toLocaleString("id-ID")} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">{formatIDR(price)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-green-700">{formatIDR(totalValue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Import CSV modal ── */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-3 sm:p-6">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-semibold text-gray-900">Import Inventory from CSV</h2>
              <button onClick={() => setShowImport(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1.5">
                <p className="font-medium text-gray-700">CSV columns: <code className="bg-gray-200 px-1 rounded">productName, quantity, unit, costPrice, notes</code></p>
                <p><span className="font-medium text-gray-600">productName</span> must match an existing product in Settings (case-insensitive).</p>
                <a href={INVENTORY_TEMPLATE} download="inventory_import_template.csv" className="flex items-center gap-1 text-blue-600 hover:text-blue-700 pt-0.5">
                  <Download size={12} /> Download template CSV
                </a>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block font-medium">Select file</label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleInventoryFile}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              {importRows.length > 0 && !importResult && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">{importRows.length} rows ready to import</p>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-52">
                    <table className="w-full text-xs min-w-[380px]">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-gray-500 font-medium">Product</th>
                          <th className="text-right px-3 py-2 text-gray-500 font-medium">Qty</th>
                          <th className="text-left px-3 py-2 text-gray-500 font-medium">Unit</th>
                          <th className="text-left px-3 py-2 text-gray-500 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importRows.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-800">{row.productName}</td>
                            <td className="px-3 py-2 text-right text-green-700 font-semibold">+{row.quantity}</td>
                            <td className="px-3 py-2 text-gray-500">{row.unit}</td>
                            <td className="px-3 py-2 text-gray-400 truncate max-w-[120px]">{row.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {importResult && (
                <div className={`rounded-xl px-4 py-3 text-sm space-y-0.5 ${importResult.failed > 0 ? "bg-amber-50 text-amber-900" : "bg-green-50 text-green-800"}`}>
                  <p className="font-semibold">Import complete</p>
                  <p>{importResult.imported} imported · {importResult.skipped} skipped · {importResult.failed} failed</p>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowImport(false)} className="flex-1 border border-gray-300 text-gray-600 rounded-xl py-2.5 text-sm font-medium">
                  {importResult ? "Close" : "Cancel"}
                </button>
                {!importResult && (
                  <button
                    onClick={handleInventoryImport}
                    disabled={importing || importRows.length === 0}
                    className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {importing ? "Importing..." : `Import ${importRows.length} rows`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Adjust Stock modal ── */}
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
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-3 text-sm font-medium hover:bg-gray-50 min-h-[44px]">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 min-h-[44px]">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Supply Item modal ── */}
      {showSupplyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Add Supply Item</h3>
              <button onClick={() => setShowSupplyModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSupplySubmit} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Name</label>
                <input
                  required
                  value={supplyForm.name}
                  onChange={(e) => setSupplyForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Matcha Powder"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Unit</label>
                  <input
                    required
                    value={supplyForm.unit}
                    onChange={(e) => setSupplyForm((f) => ({ ...f, unit: e.target.value }))}
                    placeholder="gram / ml / pcs"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Grams / Unit</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step="any"
                    value={supplyForm.gramsPerUnit}
                    onChange={(e) => setSupplyForm((f) => ({ ...f, gramsPerUnit: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Initial Stock</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step="any"
                    value={supplyForm.stock}
                    onChange={(e) => setSupplyForm((f) => ({ ...f, stock: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Price / Unit (IDR)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={supplyForm.pricePerUnit}
                    onChange={(e) => setSupplyForm((f) => ({ ...f, pricePerUnit: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowSupplyModal(false)} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-3 text-sm font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={savingSupply} className="flex-1 bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {savingSupply ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
