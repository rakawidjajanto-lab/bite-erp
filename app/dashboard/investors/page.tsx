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
  amountOut: string | null;
  investorName: string | null;
  notes: string | null;
};

const BAR_COLORS = ["bg-blue-500", "bg-violet-500", "bg-amber-400", "bg-emerald-500", "bg-rose-400"];

export default function InvestorsPage() {
  const [transactions, setTransactions] = useState<InvestorTx[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);

  const fetchInvestors = useCallback(() => {
    const { from, to } = monthBounds(year, month);
    const q = from ? `?from=${from}&to=${to}` : "";
    fetch(`/api/investors${q}`)
      .then((r) => r.json())
      .then(setTransactions)
      .catch(() => {});
  }, [year, month]);

  useEffect(() => { fetchInvestors(); }, [fetchInvestors]);

  const byInvestor: Record<string, number> = {};
  for (const tx of transactions) {
    const name = tx.investorName ?? "Unknown";
    byInvestor[name] = (byInvestor[name] ?? 0) + parseFloat(tx.amountIn ?? "0");
  }
  const total = Object.values(byInvestor).reduce((s, v) => s + v, 0);
  const rakaTotal = byInvestor["Raka"] ?? 0;
  const billaTotal = byInvestor["Billa"] ?? 0;

  const sortedInvestors = Object.entries(byInvestor).sort(([, a], [, b]) => b - a);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <>
      <Topbar title="Investors" subtitle="Ownership breakdown & investment history" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-5 max-w-3xl">

        {/* Summary cards */}
        {transactions.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
              <p className="text-xs text-gray-500 mb-1">Total Investment</p>
              <p className="text-base sm:text-lg font-bold text-gray-900">{formatIDR(total)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
              <p className="text-xs text-gray-500 mb-1">Raka&apos;s Total</p>
              <p className="text-base sm:text-lg font-bold text-blue-700">{formatIDR(rakaTotal)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
              <p className="text-xs text-gray-500 mb-1">Billa&apos;s Total</p>
              <p className="text-base sm:text-lg font-bold text-violet-700">{formatIDR(billaTotal)}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Investment Overview</h2>
            <p className="text-sm text-gray-500">Contributions from all investors</p>
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
            {/* Ownership breakdown */}
            {sortedInvestors.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
                <h3 className="font-semibold text-sm text-gray-700 mb-4">Ownership Breakdown</h3>
                {sortedInvestors.map(([name, amount], idx) => {
                  const pct = total > 0 ? (amount / total) * 100 : 0;
                  const color = BAR_COLORS[idx] ?? "bg-gray-400";
                  return (
                    <div key={name} className="mb-4 last:mb-0">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-gray-900">{name}</span>
                        <span className="text-gray-500">{pct.toFixed(1)}% &middot; {formatIDR(amount)}</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${color} rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* History table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100">
                <h3 className="font-semibold text-sm text-gray-700">Investment History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
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
                        <td className="px-4 sm:px-5 py-3 font-medium text-gray-900">{tx.investorName ?? "—"}</td>
                        <td className="px-4 sm:px-5 py-3 text-right font-semibold text-green-700 whitespace-nowrap">
                          {formatIDR(tx.amountIn)}
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
