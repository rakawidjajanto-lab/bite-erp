"use client";

import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { formatIDR } from "@/lib/formatters/currency";
import { MonthYearPicker, monthBounds } from "@/components/filters/MonthYearPicker";
import { Users } from "lucide-react";

type InvestorTx = {
  id: string;
  date: string;
  description: string;
  amountIn: string | null;
  investorName: string | null;
  resolvedName: string;
  notes: string | null;
};

type InvestorSummary = {
  name: string;
  totalIn: number;
  pct: number;
};

const INVESTOR_COLORS: Record<string, { bar: string; text: string; card: string }> = {
  Raka:    { bar: "bg-blue-500",   text: "text-blue-700",   card: "border-blue-100 bg-blue-50"    },
  Billa:   { bar: "bg-violet-500", text: "text-violet-700", card: "border-violet-100 bg-violet-50" },
  Unknown: { bar: "bg-gray-400",   text: "text-gray-600",   card: "border-gray-100 bg-gray-50"    },
};
const FALLBACK_COLORS = { bar: "bg-amber-400", text: "text-amber-700", card: "border-amber-100 bg-amber-50" };

function colorFor(name: string) {
  return INVESTOR_COLORS[name] ?? FALLBACK_COLORS;
}

export default function InvestorsPage() {
  const [transactions, setTransactions] = useState<InvestorTx[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);

  const fetchInvestors = useCallback(() => {
    const { from, to } = monthBounds(year, month);
    const q = from ? `?from=${from}&to=${to}` : "";
    fetch(`/api/investors${q}`)
      .then((r) => r.json())
      .then((data) => setTransactions(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [year, month]);

  useEffect(() => { fetchInvestors(); }, [fetchInvestors]);

  const totalPool = transactions.reduce((s, tx) => s + parseFloat(tx.amountIn ?? "0"), 0);

  const summaryMap: Record<string, number> = {};
  for (const tx of transactions) {
    const name = tx.resolvedName;
    summaryMap[name] = (summaryMap[name] ?? 0) + parseFloat(tx.amountIn ?? "0");
  }

  const investors: InvestorSummary[] = Object.entries(summaryMap)
    .map(([name, totalIn]) => ({
      name,
      totalIn,
      pct: totalPool > 0 ? (totalIn / totalPool) * 100 : 0,
    }))
    .sort((a, b) => b.totalIn - a.totalIn);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <>
      <Topbar title="Investors" subtitle="Ownership breakdown & investment history" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-5 max-w-3xl">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Investment Overview</h2>
            <p className="text-sm text-gray-500">Capital contributions from each investor</p>
          </div>
          <MonthYearPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
        </div>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
              <Users size={20} className="text-gray-400" />
            </div>
            <p className="font-medium mb-1">No investments recorded</p>
            <p className="text-sm">Investment transactions will appear here once added.</p>
          </div>
        ) : (
          <>
            {/* Per-investor summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {investors.map((inv) => {
                const c = colorFor(inv.name);
                return (
                  <div key={inv.name} className={`rounded-xl border p-4 space-y-3 ${c.card}`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold text-sm ${c.text}`}>{inv.name}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white ${c.text}`}>
                        {inv.pct.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{formatIDR(inv.totalIn)}</p>
                    <div className="h-1.5 bg-white/70 rounded-full overflow-hidden">
                      <div className={`h-full ${c.bar} rounded-full`} style={{ width: `${inv.pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ownership breakdown */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm text-gray-700">Ownership Breakdown</h3>
                <span className="text-xs text-gray-400">Total: {formatIDR(totalPool)}</span>
              </div>
              {investors.map((inv, idx) => {
                const c = colorFor(inv.name);
                return (
                  <div key={inv.name} className={idx < investors.length - 1 ? "mb-4" : ""}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-900">{inv.name}</span>
                      <span className="text-gray-500">
                        {inv.pct.toFixed(1)}% &middot; {formatIDR(inv.totalIn)}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${c.bar} rounded-full transition-all`} style={{ width: `${inv.pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* History table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100">
                <h3 className="font-semibold text-sm text-gray-700">Investment History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[400px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 sm:px-5 py-3 text-xs font-medium text-gray-500">Date</th>
                      <th className="text-left px-4 sm:px-5 py-3 text-xs font-medium text-gray-500">Investor</th>
                      <th className="text-right px-4 sm:px-5 py-3 text-xs font-medium text-gray-500">Amount</th>
                      <th className="text-left px-4 sm:px-5 py-3 text-xs font-medium text-gray-500">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-4 sm:px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(tx.date)}</td>
                        <td className="px-4 sm:px-5 py-3 font-medium text-gray-900">{tx.resolvedName}</td>
                        <td className="px-4 sm:px-5 py-3 text-right font-semibold text-green-700 whitespace-nowrap">
                          {formatIDR(parseFloat(tx.amountIn ?? "0"))}
                        </td>
                        <td className="px-4 sm:px-5 py-3 text-gray-600 max-w-[200px] truncate">{tx.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
