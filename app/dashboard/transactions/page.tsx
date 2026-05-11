"use client";

import { useState, useEffect, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { formatIDR } from "@/lib/formatters/currency";
import { CATEGORY_LABELS, CATEGORY_COLORS, type TransactionCategory } from "@/types";
import { Plus, Search, Filter } from "lucide-react";
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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    params.set("limit", "100");
    const res = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setTransactions(data.items ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [search, category]);

  useEffect(() => {
    const t = setTimeout(fetchTransactions, 300);
    return () => clearTimeout(t);
  }, [fetchTransactions]);

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
          <div className="flex gap-2">
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
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
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
          <>
            {/* Desktop table */}
            <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Description</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Category</th>
                    <th className="text-right py-3 px-4 text-green-600 font-medium">Money In</th>
                    <th className="text-right py-3 px-4 text-red-500 font-medium">Money Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-gray-900 max-w-xs truncate">{tx.description}</td>
                      <td className="py-3 px-4">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: CATEGORY_COLORS[tx.category] ?? "#94a3b8" }}
                        >
                          {CATEGORY_LABELS[tx.category] ?? tx.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">
                        {tx.amountIn ? formatIDR(parseFloat(tx.amountIn)) : "—"}
                      </td>
                      <td className="py-3 px-4 text-right text-red-500 font-medium">
                        {tx.amountOut ? formatIDR(parseFloat(tx.amountOut)) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 flex-1 min-w-0 truncate">
                      {tx.description}
                    </p>
                    <span
                      className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: CATEGORY_COLORS[tx.category] ?? "#94a3b8" }}
                    >
                      {CATEGORY_LABELS[tx.category] ?? tx.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {new Date(tx.date).toLocaleDateString("id-ID")}
                    </p>
                    <div className="flex gap-3">
                      {tx.amountIn && (
                        <p className="text-sm font-semibold text-green-600">
                          +{formatIDR(parseFloat(tx.amountIn))}
                        </p>
                      )}
                      {tx.amountOut && (
                        <p className="text-sm font-semibold text-red-500">
                          −{formatIDR(parseFloat(tx.amountOut))}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

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
