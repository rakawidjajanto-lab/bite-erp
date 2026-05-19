"use client";

import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { formatIDR } from "@/lib/formatters/currency";
import { MonthYearPicker, monthBounds } from "@/components/filters/MonthYearPicker";
import { Plus, Trash2, X, Megaphone, Upload, Download } from "lucide-react";
import { parseMarketingCsv, type ParsedGiveawayRow } from "@/lib/import/marketing-parser";

type Product = { id: string; name: string; unitCost: number; flavors: { id: string; name: string }[] };
type GiveawayItem = { id: string; quantity: number; unitCost: string; product: { name: string }; flavor: { name: string; colorHex: string | null } | null };
type Giveaway = { id: string; date: string; recipient: string; purpose: string; notes: string | null; items: GiveawayItem[] };
type DirectExpense = { id: string; date: string; description: string; amountOut: string | null };

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
  const now = new Date();
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [directExpenses, setDirectExpenses] = useState<DirectExpense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<ParsedGiveawayRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; failed: number } | null>(null);
  const [linkableTxns, setLinkableTxns] = useState<DirectExpense[]>([]);
  const [form, setForm] = useState({
    date: now.toISOString().split("T")[0],
    recipient: "",
    purpose: "ENDORSEMENT",
    notes: "",
    linkedTransactionId: "",
  });
  const [items, setItems] = useState<FormItem[]>([{ productId: "", flavorId: "", quantity: 1 }]);

  const fetchData = useCallback(() => {
    const { from, to } = monthBounds(year, month);
    const dateQ = from ? `?from=${from}&to=${to}` : "";
    const txDateQ = from ? `&from=${from}&to=${to}` : "";
    fetch(`/api/marketing/giveaways${dateQ}`).then((r) => r.json()).then(setGiveaways).catch(() => {});
    fetch(`/api/transactions?category=MARKETING&referenceIdNull=1${txDateQ}&limit=200`).then((r) => r.json()).then((d) => setDirectExpenses(d.items ?? [])).catch(() => {});
    fetch("/api/settings/products").then((r) => r.json()).then(setProducts).catch(() => {});
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetch("/api/transactions?category=MARKETING&referenceIdNull=1&limit=200")
      .then((r) => r.json())
      .then((d) => setLinkableTxns(d.items ?? []))
      .catch(() => {});
  }, []);

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
    setForm({ date: now.toISOString().split("T")[0], recipient: "", purpose: "ENDORSEMENT", notes: "", linkedTransactionId: "" });
    setItems([{ productId: "", flavorId: "", quantity: 1 }]);
    fetchData();
  }

  function handleMarketingFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseMarketingCsv(ev.target!.result as ArrayBuffer, file.name);
      setImportRows(rows);
      setImportResult(null);
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleMarketingImport() {
    if (!importRows.length) return;
    setImporting(true);
    const res = await fetch("/api/marketing/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: importRows }),
    });
    const result = await res.json();
    setImportResult(result);
    setImporting(false);
    fetchData();
  }

  const MARKETING_TEMPLATE =
    "data:text/csv;charset=utf-8,date,recipient,purpose,productName,quantity,notes\n" +
    "2024-01-15,@influencer123,endorsement,Vanilla Gelato,10,January campaign\n" +
    "2024-01-16,Food Festival Jakarta,event,Chocolate Gelato,30,Booth sampling\n" +
    "2024-01-17,@foodblogger_id,sampling,Matcha Gelato,5,";

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <>
      <Topbar title="Marketing" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-5 max-w-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Giveaways & Endorsements</h2>
            <p className="text-sm text-gray-500">Track free items given for marketing purposes</p>
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
              Log Giveaway
            </button>
          </div>
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

      {directExpenses.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">Direct Marketing Expenses</h3>
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {directExpenses.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-gray-900">{tx.description}</p>
                  <p className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <p className="text-sm font-bold text-red-500">
                  {tx.amountOut ? `−${formatIDR(parseFloat(tx.amountOut))}` : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-3 sm:p-6">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-semibold text-gray-900">Import Giveaways from CSV</h2>
              <button onClick={() => setShowImport(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
                <p className="font-medium text-gray-700">Required columns: <code className="bg-gray-200 px-1 rounded">date, recipient, purpose, productName, quantity</code></p>
                <p>purpose values: <code className="bg-gray-200 px-1 rounded">endorsement</code> · <code className="bg-gray-200 px-1 rounded">sampling</code> · <code className="bg-gray-200 px-1 rounded">event</code> · <code className="bg-gray-200 px-1 rounded">other</code></p>
                <p className="text-gray-400">productName must match an existing product name exactly (case-insensitive).</p>
                <a href={MARKETING_TEMPLATE} download="marketing_import_template.csv" className="flex items-center gap-1 text-blue-600 hover:text-blue-700 mt-1.5">
                  <Download size={12} /> Download template CSV
                </a>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1.5 block font-medium">Select CSV file</label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleMarketingFileSelect}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {importRows.length > 0 && !importResult && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">{importRows.length} rows ready to import</p>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-48">
                    <table className="w-full text-xs min-w-[440px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-gray-500 font-medium">Date</th>
                          <th className="text-left px-3 py-2 text-gray-500 font-medium">Recipient</th>
                          <th className="text-left px-3 py-2 text-gray-500 font-medium">Purpose</th>
                          <th className="text-left px-3 py-2 text-gray-500 font-medium">Product</th>
                          <th className="text-right px-3 py-2 text-gray-500 font-medium">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importRows.slice(0, 20).map((row, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-gray-500">{row.date}</td>
                            <td className="px-3 py-2 text-gray-800 max-w-[100px] truncate">{row.recipient}</td>
                            <td className="px-3 py-2 text-gray-500">{row.purpose}</td>
                            <td className="px-3 py-2 text-gray-800 max-w-[100px] truncate">{row.productName}</td>
                            <td className="px-3 py-2 text-right text-gray-700">{row.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importRows.length > 20 && <p className="text-xs text-gray-400 mt-1">Showing first 20 of {importRows.length} rows</p>}
                </div>
              )}

              {importResult && (
                <div className="bg-green-50 rounded-xl px-4 py-3 text-sm text-green-800 space-y-0.5">
                  <p className="font-semibold">Import complete</p>
                  <p>{importResult.imported} imported · {importResult.skipped} skipped · {importResult.failed} failed</p>
                  {importResult.failed > 0 && <p className="text-xs text-green-600">Failed rows likely have unrecognised product names — check your product list in Settings.</p>}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setShowImport(false)} className="flex-1 border border-gray-300 text-gray-600 rounded-xl py-2.5 text-sm font-medium">
                  {importResult ? "Close" : "Cancel"}
                </button>
                {!importResult && (
                  <button
                    onClick={handleMarketingImport}
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
                <label className="text-xs text-gray-500 mb-1 block">Link to Marketing Expense (optional)</label>
                <select
                  value={form.linkedTransactionId}
                  onChange={(e) => setForm((f) => ({ ...f, linkedTransactionId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— None (auto-create transaction) —</option>
                  {linkableTxns.map((tx) => (
                    <option key={tx.id} value={tx.id}>
                      {new Date(tx.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}{tx.description}
                      {tx.amountOut ? ` · −${formatIDR(parseFloat(tx.amountOut))}` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs mt-1 text-gray-400">
                  {form.linkedTransactionId
                    ? "Linked — no new transaction will be created (avoids double-counting)."
                    : "No link — a MARKETING transaction will be created automatically."}
                </p>
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
