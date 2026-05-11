"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { formatIDR } from "@/lib/formatters/currency";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

type CashFlowMonth = { month: string; moneyIn: number; moneyOut: number; net: number };

export default function CashFlowPage() {
  const [data, setData] = useState<CashFlowMonth[]>([]);
  const [months, setMonths] = useState(12);

  useEffect(() => {
    fetch(`/api/finance/cash-flow?months=${months}`).then((r) => r.json()).then(setData);
  }, [months]);

  const totalIn = data.reduce((s, d) => s + d.moneyIn, 0);
  const totalOut = data.reduce((s, d) => s + d.moneyOut, 0);
  const runningBalance = totalIn - totalOut;

  return (
    <>
      <Topbar title="Cash Flow" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Cash Flow</h2>
          <select
            value={months}
            onChange={(e) => setMonths(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none min-h-[44px]"
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs text-green-600 font-medium mb-1">Total In</p>
            <p className="text-xl sm:text-2xl font-bold text-green-700">{formatIDR(totalIn)}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs text-red-500 font-medium mb-1">Total Out</p>
            <p className="text-xl sm:text-2xl font-bold text-red-600">{formatIDR(totalOut)}</p>
          </div>
          <div className={`rounded-xl p-4 border ${runningBalance >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}`}>
            <p className="text-xs text-blue-600 font-medium mb-1">Running Balance</p>
            <p className={`text-xl sm:text-2xl font-bold ${runningBalance >= 0 ? "text-blue-700" : "text-red-600"}`}>
              {formatIDR(runningBalance)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Cash Flow</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ left: -10 }}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} tick={{ fontSize: 10 }} width={40} />
              <Tooltip formatter={(v: number) => formatIDR(v)} />
              <ReferenceLine y={0} stroke="#e5e7eb" />
              <Bar dataKey="moneyIn" name="Money In" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="moneyOut" name="Money Out" fill="#f87171" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[360px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Month</th>
                  <th className="text-right py-3 px-4 text-green-600 font-medium">Money In</th>
                  <th className="text-right py-3 px-4 text-red-500 font-medium">Money Out</th>
                  <th className="text-right py-3 px-4 text-gray-700 font-medium">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((d) => (
                  <tr key={d.month} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{d.month}</td>
                    <td className="py-3 px-4 text-right text-green-600">{formatIDR(d.moneyIn)}</td>
                    <td className="py-3 px-4 text-right text-red-500">{formatIDR(d.moneyOut)}</td>
                    <td className={`py-3 px-4 text-right font-medium ${d.net >= 0 ? "text-gray-900" : "text-red-600"}`}>
                      {formatIDR(d.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
