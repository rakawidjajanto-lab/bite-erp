"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { formatIDR } from "@/lib/formatters/currency";
import Link from "next/link";
import { Upload } from "lucide-react";

type Order = {
  id: string;
  externalOrderId: string;
  orderDate: string;
  status: string;
  grossAmount: string;
  netAmount: string;
  platformFee: string;
  platform: { name: string };
};

export default function PlatformsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "TOKOPEDIA" | "SHOPEE">("ALL");

  useEffect(() => {
    fetch("/api/platforms/orders")
      .then((r) => r.json())
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const safeOrders = Array.isArray(orders) ? orders : [];
  const filtered = filter === "ALL" ? safeOrders : safeOrders.filter((o) => o.platform?.name?.toUpperCase() === filter);
  const totalNet = filtered.reduce((s, o) => s + parseFloat(o.netAmount), 0);
  const totalGross = filtered.reduce((s, o) => s + parseFloat(o.grossAmount), 0);
  const totalFees = filtered.reduce((s, o) => s + parseFloat(o.platformFee), 0);

  return (
    <>
      <Topbar title="Platforms" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Tokopedia & Shopee</h2>
          <Link
            href="/dashboard/platforms/import"
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition min-h-[44px]"
          >
            <Upload size={15} />
            <span className="hidden sm:inline">Import CSV</span>
            <span className="sm:hidden">Import</span>
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(["ALL", "TOKOPEDIA", "SHOPEE"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition min-h-[44px] ${
                filter === f ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* KPIs — 1 col on mobile, 3 on sm */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Gross Revenue</p>
            <p className="text-xl font-bold text-gray-900">{formatIDR(totalGross)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Platform Fees</p>
            <p className="text-xl font-bold text-red-500">{formatIDR(totalFees)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Net Income</p>
            <p className="text-xl font-bold text-green-600">{formatIDR(totalNet)}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-16" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
            No orders yet.{" "}
            <Link href="/dashboard/platforms/import" className="text-blue-600 hover:underline">
              Import from Tokopedia or Shopee CSV
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Order ID</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Platform</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.slice(0, 100).map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-500 text-xs">{o.externalOrderId}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${o.platform.name === "Tokopedia" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                          {o.platform.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {new Date(o.orderDate).toLocaleDateString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">{o.status}</td>
                      <td className="py-3 px-4 text-right font-medium text-green-600">
                        {formatIDR(parseFloat(o.netAmount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden space-y-2">
              {filtered.slice(0, 100).map((o) => (
                <div key={o.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${o.platform.name === "Tokopedia" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                      {o.platform.name}
                    </span>
                    <p className="text-sm font-semibold text-green-600">
                      {formatIDR(parseFloat(o.netAmount))}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">{o.externalOrderId}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(o.orderDate).toLocaleDateString("id-ID")} · {o.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
