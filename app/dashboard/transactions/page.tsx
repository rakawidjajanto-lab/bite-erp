"use client";

import { useState, useEffect, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { formatIDR } from "@/lib/formatters/currency";
import { CATEGORY_LABELS, CATEGORY_COLORS, type TransactionCategory } from "@/types";
import { MonthYearPicker, monthBounds } from "@/components/filters/MonthYearPicker";
import { Plus, Search, Filter, Trash2, CheckSquare, Square } from "lucide-react";
import Link from "next/link";

type Transaction = {
  id: string;
  date: string;
  description: string;
  category: TransactionCategory;
  amountIn: string | null;
  amountOut: string | null;
  source: string;
  notes: string | null;
};

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Manual",
  TOKOPEDIA: "Tokopedia",
  SHOPEE: "Shopee",
  PADEL: "Padel",
  EXCEL_IMPORT: "Import",
  ORDER: "Order",
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const { from, to } = monthBounds(year, month);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("limit", "200");
    const res = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setTransactions(data.items ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [search, category, year, month]);

  useEffect(() => {
    const t = setTimeout(fetchTransactions, 300);
    return () => clearTimeout(t);
  }, [fetchTransactions]);

  function exitBulk() {
    setBulkMode(false);
    setSelected(new Set());
    setConfirmBulk(false);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === transactions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(transactions.map((t) => t.id)));
    }
  }

  async function deleteOne(id: string) {
    if (!confirm("Delete this transaction?")) return;
    setDeleting(true);
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    setDeleting(false);
    fetchTransactions();
  }

  async function bulkDelete() {
    if (!selected.size) return;
    setDeleting(true);
    await fetch("/api/transactions/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected] }),
    });
    setDeleting(false);
    setConfirmBulk(false);
    exitBulk();
    fetchTransactions();
  }

  const allSelected = transactions.length > 0 && selected.size === transactions.length;

  return (
    <>
      <Topbar title="Transactions" />
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">All Transactions</h2>
            <p className="text-sm text-gray-500">{total} records total</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {bulkMode ? (
              <>
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition min-h-[44px]"
                >
                  {allSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
                {selected.size > 0 && (
                  <button
                    onClick={() => setConfirmBulk(true)}
                    disabled={deleting}
                    className="flex items-center gap-1.5 text-sm bg-red-600 text-white px-3 py-2.5 rounded-lg hover:bg-red-700 transition min-h-[44px] disabled:opacity-60"
                  >
                    <Trash2 size={15} /> Delete {selected.size}
                  </button>
                )}
                <button
                  onClick={exitBulk}
                  className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition min-h-[44px]"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setBulkMode(true)}
                  className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition min-h-[44px]"
                >
                  <CheckSquare size={15} /> Select
                </button>
                <Link
                  href="/dashboard/transactions/import"
                  className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition min-h-[44px]"
                >
                  Import Excel
                </Link>
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-2.5 rounded-lg hover:bg-blue-700 transition min-h-[44px]"
                >
                  <Plus size={16} /> Add
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <MonthYearPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
          <div className="relative flex-1 min-w-[160px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              className="pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-h-[44px]"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-16" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
            No transactions found.{" "}
            <button onClick={() => setShowForm(true)} className="text-blue-600 hover:underline">
              Add the first one
            </button>
          </div>
        ) : (
          /* Scrollable table — always visible on all screen sizes */
          <div
            className="bg-white rounded-xl border border-gray-200"
            style={{ overflowX: "scroll", WebkitOverflowScrolling: "touch" }}
          >
            <table className="text-sm min-w-[1100px] w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {bulkMode && (
                    <th className="py-3 px-3 w-10">
                      <button onClick={toggleAll}>
                        {allSelected
                          ? <CheckSquare size={16} className="text-blue-600" />
                          : <Square size={16} className="text-gray-400" />}
                      </button>
                    </th>
                  )}
                  <th className="text-left py-3 px-4 text-gray-500 font-medium whitespace-nowrap">Date</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Description</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium whitespace-nowrap">Category</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium whitespace-nowrap">Platform</th>
                  <th className="text-right py-3 px-4 text-green-600 font-medium whitespace-nowrap">Money In</th>
                  <th className="text-right py-3 px-4 text-red-500 font-medium whitespace-nowrap">Money Out</th>
                  <th className="py-3 px-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`hover:bg-gray-50 transition ${bulkMode && selected.has(tx.id) ? "bg-blue-50" : ""}`}
                    onClick={bulkMode ? () => toggleSelect(tx.id) : undefined}
                  >
                    {bulkMode && (
                      <td className="py-3 px-3">
                        {selected.has(tx.id)
                          ? <CheckSquare size={16} className="text-blue-600" />
                          : <Square size={16} className="text-gray-400" />}
                      </td>
                    )}
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-gray-900 max-w-[260px]">
                      {tx.description.length > 30 ? (
                        expanded.has(tx.id) ? (
                          <span>
                            {tx.description}{" "}
                            <button
                              onClick={(e) => { e.stopPropagation(); setExpanded((p) => { const n = new Set(p); n.delete(tx.id); return n; }); }}
                              className="text-blue-500 hover:underline text-xs"
                            >
                              less
                            </button>
                          </span>
                        ) : (
                          <span>
                            {tx.description.slice(0, 30)}&hellip;{" "}
                            <button
                              onClick={(e) => { e.stopPropagation(); setExpanded((p) => new Set([...p, tx.id])); }}
                              className="text-blue-500 hover:underline text-xs"
                            >
                              more
                            </button>
                          </span>
                        )
                      ) : (
                        tx.description
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: CATEGORY_COLORS[tx.category] ?? "#94a3b8" }}
                      >
                        {CATEGORY_LABELS[tx.category] ?? tx.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                      {SOURCE_LABELS[tx.source] ?? tx.source}
                    </td>
                    <td className="py-3 px-4 text-right text-green-600 font-medium whitespace-nowrap">
                      {tx.amountIn ? formatIDR(parseFloat(tx.amountIn)) : "—"}
                    </td>
                    <td className="py-3 px-4 text-right text-red-500 font-medium whitespace-nowrap">
                      {tx.amountOut ? formatIDR(parseFloat(tx.amountOut)) : "—"}
                    </td>
                    <td className="py-3 px-3">
                      {!bulkMode && (
                        <button
                          onClick={() => deleteOne(tx.id)}
                          disabled={deleting}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk delete confirmation dialog */}
      {confirmBulk && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Delete {selected.size} transaction{selected.size !== 1 ? "s" : ""}?</h3>
            <p className="text-sm text-gray-500">This cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmBulk(false)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={bulkDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <TransactionForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            fetchTransactions();
          }}
        />
      )}
    </>
  );
}
