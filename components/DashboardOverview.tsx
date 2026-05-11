"use client";

import { useEffect, useState } from "react";
import { formatIDR, formatIDRCompact } from "@/lib/formatters/currency";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react";
import { CATEGORY_COLORS, CATEGORY_LABELS, type TransactionCategory } from "@/types";

type PLData = {
  totalIn: number;
  totalOut: number;
  netProfit: number;
  byCategory: Record<string, { in: number; out: number }>;
};

type CashFlowMonth = {
  month: string;
  moneyIn: number;
  moneyOut: number;
  net: number;
};

function KPICard({
  label,
  value,
  sub,
  positive,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm text-gray-500 font-medium">{label}</span>
        <div className="p-1.5 sm:p-2 bg-gray-50 rounded-lg">
          <Icon size={16} className="text-gray-400" />
        </div>
      </div>
      <div>
        <p
          className={`text-xl sm:text-2xl font-bold ${positive === false ? "text-red-600" : positive === true ? "text-green-600" : "text-gray-900"}`}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{sub}</p>}
      </div>
    </div>
  );
}

export function DashboardOverview() {
  const [pl, setPL] = useState<PLData | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowMonth[]>([]);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    fetch(`/api/finance/pl?year=${currentYear}&month=${currentMonth}`)
      .then((r) => r.json())
      .then(setPL);
    fetch("/api/finance/cash-flow?months=6")
      .then((r) => r.json())
      .then(setCashFlow);
  }, [currentMonth, currentYear]);

  const expenseByCategory = pl
    ? Object.entries(pl.byCategory)
        .filter(([, v]) => v.out > 0)
        .map(([cat, v]) => ({
          name: CATEGORY_LABELS[cat as TransactionCategory] ?? cat,
          value: v.out,
          color: CATEGORY_COLORS[cat as TransactionCategory] ?? "#94a3b8",
        }))
    : [];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          {now.toLocaleString("id-ID", { month: "long", year: "numeric" })}
        </h2>
        <p className="text-sm text-gray-500">Month-to-date summary</p>
      </div>

      {/* KPI grid — 2 cols on mobile, 4 on lg */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          label="Total Revenue"
          value={pl ? formatIDRCompact(pl.totalIn) : "—"}
          sub="Money in this month"
          positive={true}
          icon={TrendingUp}
        />
        <KPICard
          label="Total Expenses"
          value={pl ? formatIDRCompact(pl.totalOut) : "—"}
          sub="Money out this month"
          positive={false}
          icon={TrendingDown}
        />
        <KPICard
          label="Net Profit"
          value={pl ? formatIDRCompact(pl.netProfit) : "—"}
          sub="Revenue minus expenses"
          positive={pl ? pl.netProfit >= 0 : undefined}
          icon={DollarSign}
        />
        <KPICard
          label="Cash Balance"
          value={
            cashFlow.length > 0
              ? formatIDRCompact(cashFlow.reduce((s, m) => s + m.net, 0))
              : "—"
          }
          sub="6-month running net"
          icon={Wallet}
        />
      </div>

      {/* Charts — stacked on mobile, side by side on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Cash Flow — Last 6 Months
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cashFlow} margin={{ left: -10 }}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis
                tickFormatter={(v) => formatIDRCompact(v)}
                tick={{ fontSize: 10 }}
                width={60}
              />
              <Tooltip
                formatter={(v: number) => formatIDR(v)}
                labelStyle={{ fontWeight: 600 }}
              />
              <Bar dataKey="moneyIn" name="Money In" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="moneyOut" name="Money Out" fill="#f87171" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Expenses by Category
          </h3>
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  cx="50%"
                  cy="42%"
                  outerRadius={65}
                  dataKey="value"
                >
                  {expenseByCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatIDR(v)} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
              No expense data yet
            </div>
          )}
        </div>
      </div>

      {/* P&L table — horizontal scroll on mobile */}
      {pl && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            P&L by Category — This Month
          </h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm min-w-[420px] px-4 sm:px-0">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pl-4 sm:pl-0 text-gray-500 font-medium">Category</th>
                  <th className="text-right py-2 text-green-600 font-medium">Money In</th>
                  <th className="text-right py-2 text-red-500 font-medium">Money Out</th>
                  <th className="text-right py-2 pr-4 sm:pr-0 text-gray-700 font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(pl.byCategory).map(([cat, v]) => (
                  <tr key={cat} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 pl-4 sm:pl-0 text-gray-700">
                      {CATEGORY_LABELS[cat as TransactionCategory] ?? cat}
                    </td>
                    <td className="py-2.5 text-right text-green-600">
                      {v.in > 0 ? formatIDR(v.in) : "—"}
                    </td>
                    <td className="py-2.5 text-right text-red-500">
                      {v.out > 0 ? formatIDR(v.out) : "—"}
                    </td>
                    <td
                      className={`py-2.5 text-right pr-4 sm:pr-0 font-medium ${v.in - v.out >= 0 ? "text-gray-900" : "text-red-600"}`}
                    >
                      {formatIDR(v.in - v.out)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 font-semibold">
                  <td className="py-3 pl-4 sm:pl-0">Total</td>
                  <td className="py-3 text-right text-green-600">{formatIDR(pl.totalIn)}</td>
                  <td className="py-3 text-right text-red-500">{formatIDR(pl.totalOut)}</td>
                  <td
                    className={`py-3 text-right pr-4 sm:pr-0 ${pl.netProfit >= 0 ? "text-gray-900" : "text-red-600"}`}
                  >
                    {formatIDR(pl.netProfit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
