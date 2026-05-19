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
import { TrendingUp, TrendingDown, DollarSign, Wallet, Banknote, Package, Landmark, FlaskConical, Megaphone, BarChart2 } from "lucide-react";
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

type AssetsData = {
  cashBalance: number;
  inventoryValue: number;
  physicalAssetValue: number;
  totalAssets: number;
  rndThisMonth: number;
  marketingGiveawayValue: number;
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
  const [plAllTime, setPlAllTime] = useState<PLData | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowMonth[]>([]);
  const [assets, setAssets] = useState<AssetsData | null>(null);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    fetch(`/api/finance/pl?year=${currentYear}&month=${currentMonth}`)
      .then((r) => r.json())
      .then(setPL);
    fetch("/api/finance/pl?all=true")
      .then((r) => r.json())
      .then(setPlAllTime);
    fetch("/api/finance/cash-flow?months=6")
      .then((r) => r.json())
      .then(setCashFlow);
    fetch("/api/dashboard/assets")
      .then((r) => r.json())
      .then(setAssets);
  }, [currentMonth, currentYear]);

  const expenseByCategory = plAllTime
    ? Object.entries(plAllTime.byCategory)
        .filter(([cat, v]) => v.out > 0 && cat !== "INVESTMENT")
        .map(([cat, v]) => ({
          name: CATEGORY_LABELS[cat as TransactionCategory] ?? cat,
          value: v.out,
          color: CATEGORY_COLORS[cat as TransactionCategory] ?? "#94a3b8",
        }))
    : [];

  const projection = cashFlow.length >= 3 ? (() => {
    const avgIn  = cashFlow.reduce((s, m) => s + m.moneyIn,  0) / cashFlow.length;
    const avgOut = cashFlow.reduce((s, m) => s + m.moneyOut, 0) / cashFlow.length;
    const lastMonth = cashFlow[cashFlow.length - 1].month;
    return [1, 2, 3].map((offset) => {
      const [y, mo] = lastMonth.split("-").map(Number);
      const d = new Date(y, mo - 1 + offset, 1);
      return {
        month: d.toLocaleString("id-ID", { month: "short", year: "numeric" }),
        moneyIn: avgIn,
        moneyOut: avgOut,
        net: avgIn - avgOut,
      };
    });
  })() : [];

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
          value={assets ? formatIDRCompact(assets.cashBalance) : "—"}
          sub="All-time net cash"
          positive={assets ? assets.cashBalance >= 0 : undefined}
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

      {/* Asset Summary */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Asset Summary</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="p-2.5 bg-green-50 rounded-xl shrink-0">
              <Banknote size={18} className="text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">Cash Balance</p>
              <p className="text-base sm:text-lg font-bold text-gray-900 truncate">
                {assets ? formatIDR(assets.cashBalance) : "—"}
              </p>
              <p className="text-xs text-gray-400 hidden sm:block">All-time net cash</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl shrink-0">
              <Package size={18} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">Inventory Value</p>
              <p className="text-base sm:text-lg font-bold text-gray-900 truncate">
                {assets ? formatIDR(assets.inventoryValue) : "—"}
              </p>
              <p className="text-xs text-gray-400 hidden sm:block">Stock × cost price</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-xl shrink-0">
              <Landmark size={18} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">Equipment & Assets</p>
              <p className="text-base sm:text-lg font-bold text-gray-900 truncate">
                {assets ? formatIDR(assets.physicalAssetValue) : "—"}
              </p>
              <p className="text-xs text-gray-400 hidden sm:block">Current est. value</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl shrink-0">
              <BarChart2 size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-blue-700 font-medium">Total Assets</p>
              <p className="text-base sm:text-lg font-bold text-blue-900 truncate">
                {assets ? formatIDR(assets.totalAssets) : "—"}
              </p>
              <p className="text-xs text-blue-500 hidden sm:block">Cash + Inv + Equipment</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg shrink-0">
              <FlaskConical size={16} className="text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">R&D This Month</p>
              <p className="text-base font-semibold text-gray-900 truncate">
                {assets ? formatIDR(assets.rndThisMonth) : "—"}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg shrink-0">
              <Megaphone size={16} className="text-orange-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Marketing Giveaways</p>
              <p className="text-base font-semibold text-gray-900 truncate">
                {assets ? formatIDR(assets.marketingGiveawayValue) : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Projection */}
      {projection.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Financial Projection — Next 3 Months</h3>
          <p className="text-xs text-gray-400 mb-3">Based on 6-month average of operational transactions</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {projection.map((p) => (
              <div key={p.month} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{p.month}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Revenue</span>
                    <span className="text-green-600 font-medium">{formatIDRCompact(p.moneyIn)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Expenses</span>
                    <span className="text-red-500 font-medium">{formatIDRCompact(p.moneyOut)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-1 mt-1">
                    <span className="font-medium text-gray-700">Net</span>
                    <span className={`font-bold ${p.net >= 0 ? "text-gray-900" : "text-red-600"}`}>
                      {formatIDRCompact(p.net)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
