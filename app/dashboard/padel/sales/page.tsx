"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PadelSaleForm } from "@/components/forms/PadelSaleForm";
import { formatIDR } from "@/lib/formatters/currency";
import { Plus } from "lucide-react";

type Sale = {
  id: string;
  saleDate: string;
  quantitySold: number;
  totalAmount: string;
  flavor: { name: string; colorHex: string | null };
};

export default function PadelSalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [showForm, setShowForm] = useState(false);

  const fetchSales = () =>
    fetch("/api/padel/sales?days=30")
      .then((r) => r.json())
      .then(setSales);

  useEffect(() => { fetchSales(); }, []);

  return (
    <>
      <Topbar title="Padel Sales" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Sales Log</h2>
            <p className="text-sm text-gray-500">Last 30 days at padel venue</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 transition active:scale-95"
          >
            <Plus size={16} />
            Log Sales
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {sales.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              No sales logged yet.{" "}
              <button onClick={() => setShowForm(true)} className="text-blue-600 hover:underline">Log today&apos;s sales</button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Flavor</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Qty</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap text-xs">
                      {new Date(s.saleDate).toLocaleDateString("id-ID")}
                    </td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-2">
                        {s.flavor.colorHex && (
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.flavor.colorHex }} />
                        )}
                        {s.flavor.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700 font-medium">{s.quantitySold}</td>
                    <td className="py-3 px-4 text-right text-green-600 font-medium">
                      {formatIDR(parseFloat(s.totalAmount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <PadelSaleForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchSales(); }}
        />
      )}
    </>
  );
}
