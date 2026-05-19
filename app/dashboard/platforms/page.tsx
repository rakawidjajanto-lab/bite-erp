"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { formatIDR } from "@/lib/formatters/currency";
import Link from "next/link";
import { Upload, Trash2 } from "lucide-react";

type OrderItem = {
  productName: string | null;
  quantity: number;
};

type Order = {
  id: string;
  externalOrderId: string;
  orderDate: string;
  settlementDate: string | null;
  status: string;
  grossAmount: string;
  netAmount: string;
  platformFee: string;
  platform: { name: string };
  items: OrderItem[];
};

function StatusBadge({ status }: { status: string }) {
  const settled = status === "DELIVERED";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        settled ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
      }`}
    >
      {settled ? "Settled" : "Pending"}
    </span>
  );
}

function productLabel(items: OrderItem[]): string {
  const names = items.map((i) => i.productName).filter(Boolean) as string[];
  if (names.length === 0) return "—";
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1} more`;
}

function totalQty(items: OrderItem[]): number {
  return items.reduce((s, i) => s + i.quantity, 0);
}

export default function PlatformsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "TOKOPEDIA" | "SHOPEE">("ALL");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this order? The linked transaction will also be removed.")) return;
    setDeleting(id);
    await fetch(`/api/platforms/orders/${id}`, { method: "DELETE" });
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setDeleting(null);
  }

  useEffect(() => {
    fetch("/api/platforms/orders")
      .then((r) => r.json())
      .then((data) => setOrders(Array.isArray(data?.items) ? data.items : []))
      .finally(() => setLoading(false));
  }, []);

  const safeOrders = Array.isArray(orders) ? orders : [];
  const filtered =
    filter === "ALL"
      ? safeOrders
      : safeOrders.filter((o) => o.platform?.name?.toUpperCase() === filter);

  const totalGross = filtered.reduce((s, o) => s + parseFloat(o.grossAmount), 0);
  const totalFees = filtered.reduce((s, o) => s + parseFloat(o.platformFee), 0);
  const totalNet = filtered.reduce((s, o) => s + parseFloat(o.netAmount), 0);

  return (
    <>
      <Topbar title="Platforms" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Tokopedia &amp; Shopee</h2>
          <Link
            href="/dashboard/platforms/import"
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition min-h-[44px]"
          >
            <Upload size={15} />
            <span className="hidden sm:inline">Import Excel</span>
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
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* KPIs */}
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
            <p className="text-xs text-gray-500 mb-1">Nett Received</p>
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
              Import from Tokopedia or Shopee Excel
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Date</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Order ID</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Platform</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Product</th>
                      <th className="text-right py-3 px-4 text-gray-500 font-medium">Qty</th>
                      <th className="text-right py-3 px-4 text-gray-500 font-medium">Gross Revenue</th>
                      <th className="text-right py-3 px-4 text-gray-500 font-medium">Platform Fee</th>
                      <th className="text-right py-3 px-4 text-gray-500 font-medium">Nett Received</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Settlement Date</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                      <th className="py-3 px-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.slice(0, 100).map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(o.orderDate).toLocaleDateString("id-ID")}
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-xs max-w-[140px] truncate">
                          {o.externalOrderId}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${
                              o.platform.name === "Tokopedia"
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {o.platform.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700 text-xs max-w-[180px] truncate">
                          {productLabel(o.items)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600 text-xs">
                          {totalQty(o.items) || "—"}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700 text-xs">
                          {formatIDR(parseFloat(o.grossAmount))}
                        </td>
                        <td className="py-3 px-4 text-right text-red-500 text-xs">
                          {formatIDR(parseFloat(o.platformFee))}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-green-600 text-xs">
                          {formatIDR(parseFloat(o.netAmount))}
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                          {o.settlementDate
                            ? new Date(o.settlementDate).toLocaleDateString("id-ID")
                            : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="py-3 px-2">
                          <button
                            onClick={() => handleDelete(o.id)}
                            disabled={deleting === o.id}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden space-y-2">
              {filtered.slice(0, 100).map((o) => (
                <div key={o.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        o.platform.name === "Tokopedia"
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {o.platform.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={o.status} />
                      <button
                        onClick={() => handleDelete(o.id)}
                        disabled={deleting === o.id}
                        className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{productLabel(o.items)}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{o.externalOrderId}</span>
                    <span>{new Date(o.orderDate).toLocaleDateString("id-ID")}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      Gross: {formatIDR(parseFloat(o.grossAmount))}
                    </span>
                    <span className="font-semibold text-green-600">
                      Nett: {formatIDR(parseFloat(o.netAmount))}
                    </span>
                  </div>
                  {o.settlementDate && (
                    <p className="text-xs text-gray-400">
                      Settlement: {new Date(o.settlementDate).toLocaleDateString("id-ID")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
