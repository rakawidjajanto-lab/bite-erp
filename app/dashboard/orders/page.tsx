"use client";

import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Plus, Upload, X, Download, Pencil, ShoppingCart } from "lucide-react";
import { parseOrdersCsv } from "@/lib/import/orders-parser";

type Ingredient = { id: string; name: string; quantity: number; unit: string; pricePerUnit: number };
type Variant = {
  id: string;
  size: string;
  sellingPrice: number;
  product: { name: string };
  flavor: { name: string } | null;
  ingredients: Ingredient[];
};

type OrderItem = {
  id: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  variant: { product: { name: string }; flavor: { name: string } | null; size: string };
};

type Order = {
  id: string;
  orderDate: string;
  customerName: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  notes: string | null;
  items: OrderItem[];
};

type FormItem = { variantId: string; quantity: number; unitPrice: number };

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

function variantLabel(v: Variant) {
  const parts = [v.product.name];
  if (v.flavor) parts.push(v.flavor.name);
  parts.push(v.size);
  return parts.join(" – ");
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const ORDERS_TEMPLATE =
  "data:text/csv;charset=utf-8,orderRef,date,customerName,productName,flavorName,size,quantity,unitPrice,deliveryFee,notes\n" +
  "ORD-001,2026-05-01,Budi Santoso,Gelato,Vanilla,Cup 150ml,2,35000,15000,\n" +
  "ORD-001,2026-05-01,Budi Santoso,Gelato,Matcha,Pint 450ml,1,90000,,\n" +
  "ORD-002,2026-05-02,Siti Rahayu,Gelato,,Cup 150ml,3,35000,0,Test order\n";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [customers, setCustomers] = useState<string[]>([]);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [customerFilter, setCustomerFilter] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [customerName, setCustomerName] = useState("");
  const [orderDate, setOrderDate] = useState(today());
  const [items, setItems] = useState<FormItem[]>([{ variantId: "", quantity: 1, unitPrice: 0 }]);
  const [deliveryFee, setDeliveryFee] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Import modal
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<ReturnType<typeof parseOrdersCsv>>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; failed: number } | null>(null);

  const fetchOrders = useCallback(() => {
    const params = new URLSearchParams({ from, to });
    if (customerFilter) params.set("customer", customerFilter);
    fetch(`/api/orders?${params}`).then((r) => r.json()).then(setOrders).catch(() => {});
  }, [from, to, customerFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    fetch("/api/settings/variants").then((r) => r.json()).then(setVariants).catch(() => {});
    fetch("/api/orders/customers").then((r) => r.json()).then(setCustomers).catch(() => {});
  }, []);

  function openNew() {
    setEditingOrder(null);
    setCustomerName("");
    setOrderDate(today());
    setItems([{ variantId: "", quantity: 1, unitPrice: 0 }]);
    setDeliveryFee("");
    setNotes("");
    setStep(1);
    setShowModal(true);
  }

  function openEdit(order: Order) {
    setEditingOrder(order);
    setCustomerName(order.customerName);
    setOrderDate(order.orderDate.split("T")[0]);
    setItems(
      order.items.map((it) => ({
        variantId: it.variantId,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
      }))
    );
    setDeliveryFee(Number(order.deliveryFee) > 0 ? String(order.deliveryFee) : "");
    setNotes(order.notes || "");
    setStep(1);
    setShowModal(true);
  }

  function setItemVariant(idx: number, variantId: string) {
    const v = variants.find((vv) => vv.id === variantId);
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, variantId, unitPrice: v ? Number(v.sellingPrice) : it.unitPrice } : it
      )
    );
  }

  function setItemQty(idx: number, qty: number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: Math.max(1, qty) } : it)));
  }

  function setItemPrice(idx: number, price: number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, unitPrice: price } : it)));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addItem() {
    setItems((prev) => [...prev, { variantId: "", quantity: 1, unitPrice: 0 }]);
  }

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const fee = parseFloat(deliveryFee) || 0;
  const total = subtotal + fee;

  async function submit() {
    if (!customerName.trim() || !orderDate || items.some((it) => !it.variantId)) return;
    setSubmitting(true);

    const body = { customerName: customerName.trim(), orderDate, items, deliveryFee: fee, notes };
    const url = editingOrder ? `/api/orders/${editingOrder.id}` : "/api/orders";
    const method = editingOrder ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSubmitting(false);
    if (res.ok) {
      setShowModal(false);
      fetchOrders();
      fetch("/api/orders/customers").then((r) => r.json()).then(setCustomers).catch(() => {});
    }
  }

  async function handleImportFile(file: File) {
    const buf = await file.arrayBuffer();
    setImportRows(parseOrdersCsv(buf, file.name));
    setImportResult(null);
  }

  async function runImport() {
    setImporting(true);
    const res = await fetch("/api/orders/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: importRows }),
    });
    const result = await res.json();
    setImportResult(result);
    setImporting(false);
    if (result.imported > 0) fetchOrders();
  }

  return (
    <>
      <Topbar title="Orders" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-gray-800 text-lg">Customer Orders</h2>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowImport(true); setImportRows([]); setImportResult(null); }}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              <Upload size={14} /> Import CSV
            </button>
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <Plus size={14} /> New Order
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="self-center text-gray-400 text-sm">–</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            placeholder="Filter by customer..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
          />
        </div>

        {/* Order list */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <ShoppingCart size={40} strokeWidth={1} />
            <p className="text-sm">No orders in this period.</p>
            <button onClick={openNew} className="text-blue-600 text-sm hover:underline">Create the first order</button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm">{order.customerName}</p>
                    <span className="text-xs text-gray-400">{new Date(order.orderDate).toLocaleDateString("id-ID")}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {order.items.map((it) => (
                      <span key={it.id} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                        {[it.variant.product.name, it.variant.flavor?.name, it.variant.size].filter(Boolean).join(" – ")} ×{it.quantity}
                      </span>
                    ))}
                  </div>
                  {order.notes && <p className="text-xs text-gray-400 truncate">{order.notes}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 text-sm">{fmt(Number(order.total))}</p>
                    {Number(order.deliveryFee) > 0 && (
                      <p className="text-xs text-gray-400">+{fmt(Number(order.deliveryFee))} delivery</p>
                    )}
                  </div>
                  <button
                    onClick={() => openEdit(order)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 text-lg">
                  {editingOrder ? "Edit Order" : "New Order"}
                </h2>
                <button onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>

              <datalist id="dl-customers">
                {customers.map((c) => <option key={c} value={c} />)}
              </datalist>

              {step === 1 && (
                <div className="space-y-4">
                  {/* Customer + date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Customer Name</label>
                      <input
                        required
                        list="dl-customers"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Customer name..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Order Date</label>
                      <input
                        type="date"
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500">Items</label>
                    {items.map((it, idx) => (
                      <div key={idx} className="flex gap-2 items-center flex-wrap">
                        <select
                          value={it.variantId}
                          onChange={(e) => setItemVariant(idx, e.target.value)}
                          className="flex-1 min-w-[180px] border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select variant...</option>
                          {variants.map((v) => (
                            <option key={v.id} value={v.id}>{variantLabel(v)}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1 border border-gray-300 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setItemQty(idx, it.quantity - 1)}
                            className="px-2 py-2 text-gray-500 hover:bg-gray-100 transition"
                          >−</button>
                          <span className="px-3 text-sm font-medium text-gray-700 min-w-[2rem] text-center">{it.quantity}</span>
                          <button
                            type="button"
                            onClick={() => setItemQty(idx, it.quantity + 1)}
                            className="px-2 py-2 text-gray-500 hover:bg-gray-100 transition"
                          >+</button>
                        </div>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={it.unitPrice}
                          onChange={(e) => setItemPrice(idx, parseFloat(e.target.value) || 0)}
                          className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Price"
                        />
                        <span className="text-xs text-gray-500 min-w-[70px] text-right">{fmt(it.quantity * it.unitPrice)}</span>
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-500">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline">+ Add item</button>
                  </div>

                  {/* Delivery fee + notes */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Delivery Fee (IDR, optional)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={deliveryFee}
                        onChange={(e) => setDeliveryFee(e.target.value)}
                        placeholder="0"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
                      <input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
                    <button
                      type="button"
                      disabled={!customerName.trim() || items.some((it) => !it.variantId)}
                      onClick={() => setStep(2)}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60"
                    >
                      Review Order
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-700 text-sm">Order Summary</h3>

                  {/* Summary table */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {items.map((it, idx) => {
                          const v = variants.find((vv) => vv.id === it.variantId);
                          return (
                            <tr key={idx}>
                              <td className="px-4 py-2 text-gray-800">{v ? variantLabel(v) : it.variantId}</td>
                              <td className="px-4 py-2 text-right text-gray-600">{it.quantity}</td>
                              <td className="px-4 py-2 text-right text-gray-600">{fmt(it.unitPrice)}</td>
                              <td className="px-4 py-2 text-right font-medium text-gray-800">{fmt(it.quantity * it.unitPrice)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>{fmt(subtotal)}</span>
                    </div>
                    {fee > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Delivery Fee</span>
                        <span>{fmt(fee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-200">
                      <span>Grand Total</span>
                      <span>{fmt(total)}</span>
                    </div>
                  </div>

                  {notes && <p className="text-xs text-gray-400">Note: {notes}</p>}

                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setStep(1)} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Back</button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={submit}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-60"
                    >
                      {submitting ? "Saving…" : "Confirm Order"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import CSV modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Import Orders CSV</h2>
                <button onClick={() => setShowImport(false)}><X size={18} /></button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 space-y-1">
                <p className="font-medium">Columns: orderRef, date, customerName, productName, flavorName, size, quantity, unitPrice, deliveryFee, notes</p>
                <p>Rows with the same non-blank <strong>orderRef</strong> are grouped into one order. Leave blank for single-item orders.</p>
                <p>Leave <strong>unitPrice</strong> blank to use the variant&apos;s selling price. <strong>deliveryFee</strong> is read from the first row of each order group.</p>
              </div>

              <a
                href={ORDERS_TEMPLATE}
                download="orders_template.csv"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
              >
                <Download size={12} /> Download template CSV
              </a>

              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-blue-400 transition">
                <Upload size={20} className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Click or drop a CSV / Excel file</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])}
                />
              </label>

              {importRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">{importRows.length} row(s) parsed</p>
                  <div className="border border-gray-200 rounded-xl overflow-x-auto max-h-60">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Ref", "Date", "Customer", "Product", "Flavor", "Size", "Qty", "Unit Price", "Delivery", "Notes"].map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importRows.map((r, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-1.5 text-gray-500">{r.orderRef || "—"}</td>
                            <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{r.date}</td>
                            <td className="px-3 py-1.5 text-gray-700">{r.customerName}</td>
                            <td className="px-3 py-1.5 text-gray-700">{r.productName}</td>
                            <td className="px-3 py-1.5 text-gray-500">{r.flavorName || "—"}</td>
                            <td className="px-3 py-1.5 text-gray-700">{r.size}</td>
                            <td className="px-3 py-1.5 text-right text-gray-700">{r.quantity}</td>
                            <td className="px-3 py-1.5 text-right text-gray-700">{r.unitPrice || "—"}</td>
                            <td className="px-3 py-1.5 text-right text-gray-500">{r.deliveryFee || "—"}</td>
                            <td className="px-3 py-1.5 text-gray-400">{r.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {importResult && (
                    <div className={`rounded-xl px-4 py-3 text-sm ${importResult.failed > 0 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                      {importResult.imported} order(s) imported, {importResult.skipped} skipped, {importResult.failed} failed (variant not found).
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => setShowImport(false)} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Close</button>
                    <button
                      onClick={runImport}
                      disabled={importing || !!importResult}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60"
                    >
                      {importing ? "Importing…" : importResult ? "Done" : "Import"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
