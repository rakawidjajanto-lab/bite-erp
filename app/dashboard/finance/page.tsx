"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { formatIDR } from "@/lib/formatters/currency";
import { CATEGORY_LABELS, CATEGORY_COLORS, type TransactionCategory } from "@/types";
import Link from "next/link";

type PLData = {
  totalIn: number;
  totalOut: number;
  netProfit: number;
  byCategory: Record<string, { in: number; out: number }>;
};

export default function FinancePage() {
  const [pl, setPL] = useState<PLData | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | "">(new Date().getMonth() + 1);

  useEffect(() => {
    const params = new URLSearchParams({ year: String(year) });
    if (month !== "") params.set("month", String(month));
    fetch(`/api/finance/pl?${params}`).then((r) => r.json()).then(setPL);
  }, [year, month]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <>
      <Topbar title="Finance" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 w-full sm:w-auto">P&L Report</h2>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none min-h-[44px]"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value === "" ? "" : parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none min-h-[44px]"
          >
            <option value="">Full Year</option>
            {months.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <div className="flex gap-2 sm:ml-auto">
            <Link
              href="/dashboard/finance/cash-flow"
              className="text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition min-h-[44px] flex items-center"
            >
              Cash Flow
            </Link>
            <Link
              href="/dashboard/finance/projections"
              className="text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition min-h-[44px] flex items-center"
            >
              Projections
            </Link>
          </div>
        </div>

        {pl && (
          <>
            {/* KPI row — 1 col on mobile, 3 on sm */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-xs text-green-600 font-medium mb-1">Total Revenue</p>
                <p className="text-xl sm:text-2xl font-bold text-green-700">{formatIDR(pl.totalIn)}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs text-red-500 font-medium mb-1">Total Expenses</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{formatIDR(pl.totalOut)}</p>
              </div>
              <div className={`rounded-xl p-4 border ${pl.netProfit >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}`}>
                <p className="text-xs text-blue-600 font-medium mb-1">Net Profit</p>
                <p className={`text-xl sm:text-2xl font-bold ${pl.netProfit >= 0 ? "text-blue-700" : "text-red-600"}`}>
                  {formatIDR(pl.netProfit)}
                </p>
              </div>
            </div>

            {/* P&L breakdown table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 text-sm">Breakdown by Category</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[400px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Category</th>
                      <th className="text-right py-3 px-4 text-green-600 font-medium">Money In</th>
                      <th className="text-right py-3 px-4 text-red-500 font-medium">Money Out</th>
                      <th className="text-right py-3 px-4 text-gray-700 font-medium">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(pl.byCategory).map(([cat, v]) => (
                      <tr key={cat} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: CATEGORY_COLORS[cat as TransactionCategory] ?? "#94a3b8" }}
                            />
                            {CATEGORY_LABELS[cat as TransactionCategory] ?? cat}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-green-600">{v.in > 0 ? formatIDR(v.in) : "—"}</td>
                        <td className="py-3 px-4 text-right text-red-500">{v.out > 0 ? formatIDR(v.out) : "—"}</td>
                        <td className={`py-3 px-4 text-right font-medium ${v.in - v.out >= 0 ? "text-gray-900" : "text-red-600"}`}>
                          {formatIDR(v.in - v.out)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 font-semibold bg-gray-50">
                      <td className="py-3 px-4">Total</td>
                      <td className="py-3 px-4 text-right text-green-600">{formatIDR(pl.totalIn)}</td>
                      <td className="py-3 px-4 text-right text-red-500">{formatIDR(pl.totalOut)}</td>
                      <td className={`py-3 px-4 text-right ${pl.netProfit >= 0 ? "text-gray-900" : "text-red-600"}`}>
                        {formatIDR(pl.netProfit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
