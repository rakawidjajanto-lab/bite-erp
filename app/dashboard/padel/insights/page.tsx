"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { formatIDR } from "@/lib/formatters/currency";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Insight = {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  margin: number;
  topFlavors: { flavorId: string; name: string; revenue: number; qty: number }[];
  days: number;
};

export default function PadelInsightsPage() {
  const [data, setData] = useState<Insight | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetch(`/api/padel/insights?days=${days}`).then((r) => r.json()).then(setData);
  }, [days]);

  return (
    <>
      <Topbar title="Padel Insights" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Venue Insights</h2>
          <select value={days} onChange={(e) => setDays(parseInt(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-xs text-green-600 font-medium mb-1">Revenue</p>
                <p className="text-xl font-bold text-green-700">{formatIDR(data.totalRevenue)}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs text-red-500 font-medium mb-1">Cost</p>
                <p className="text-xl font-bold text-red-600">{formatIDR(data.totalCost)}</p>
              </div>
              <div className={`rounded-xl p-4 border ${data.grossProfit >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}`}>
                <p className="text-xs text-blue-600 font-medium mb-1">Gross Profit</p>
                <p className={`text-xl font-bold ${data.grossProfit >= 0 ? "text-blue-700" : "text-red-600"}`}>
                  {formatIDR(data.grossProfit)}
                </p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-xs text-purple-600 font-medium mb-1">Margin</p>
                <p className="text-xl font-bold text-purple-700">{data.margin.toFixed(1)}%</p>
              </div>
            </div>

            {data.topFlavors.length > 0 && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue by Flavor</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.topFlavors} layout="vertical">
                      <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}rb`} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                      <Tooltip formatter={(v: number) => formatIDR(v)} />
                      <Bar dataKey="revenue" fill="#6366f1" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700">Flavor Ranking</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">#</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Flavor</th>
                        <th className="text-right py-3 px-4 text-gray-500 font-medium">Qty Sold</th>
                        <th className="text-right py-3 px-4 text-gray-500 font-medium">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.topFlavors.map((f, i) => (
                        <tr key={f.flavorId} className="hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-400 font-bold">{i + 1}</td>
                          <td className="py-3 px-4 font-medium text-gray-900">{f.name}</td>
                          <td className="py-3 px-4 text-right text-gray-700">{f.qty} pcs</td>
                          <td className="py-3 px-4 text-right text-green-600 font-medium">{formatIDR(f.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
