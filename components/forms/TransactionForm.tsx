"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionSchema, type TransactionFormValues } from "@/lib/validations/transaction.schema";
import { CATEGORY_LABELS } from "@/types";
import { X } from "lucide-react";

export function TransactionForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      source: "MANUAL",
      type: "out",
    },
  });

  const category = watch("category");
  const type = watch("type");

  async function onSubmit(values: TransactionFormValues) {
    setSaving(true);
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">Add Transaction</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="flex gap-2">
            <label className={`flex-1 flex items-center justify-center py-2.5 rounded-lg border-2 cursor-pointer transition font-medium text-sm ${type === "in" ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500"}`}>
              <input type="radio" value="in" {...register("type")} className="sr-only" />
              Money In
            </label>
            <label className={`flex-1 flex items-center justify-center py-2.5 rounded-lg border-2 cursor-pointer transition font-medium text-sm ${type === "out" ? "border-red-400 bg-red-50 text-red-600" : "border-gray-200 text-gray-500"}`}>
              <input type="radio" value="out" {...register("type")} className="sr-only" />
              Money Out
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              {...register("date")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              {...register("description")}
              placeholder="e.g. Pembelian stiker, Income Tokopedia..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              {...register("category")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select category...</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
          </div>

          {category === "INVESTMENT" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Investment Direction</label>
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer text-sm">
                    <input type="radio" value="IN" {...register("investmentDirection")} />
                    Modal Masuk (IN)
                  </label>
                  <label className="flex-1 flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer text-sm">
                    <input type="radio" value="OUT" {...register("investmentDirection")} />
                    Modal Keluar (OUT)
                  </label>
                </div>
                {errors.investmentDirection && <p className="text-red-500 text-xs mt-1">{errors.investmentDirection.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Investor Name</label>
                <input
                  type="text"
                  {...register("investorName")}
                  placeholder="e.g. Raka, Family, ..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (IDR)</label>
            <input
              type="number"
              inputMode="numeric"
              {...register("amount")}
              placeholder="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <select
              {...register("source")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="MANUAL">Manual</option>
              <option value="TOKOPEDIA">Tokopedia</option>
              <option value="SHOPEE">Shopee</option>
              <option value="PADEL">Padel Venue</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              {...register("notes")}
              rows={2}
              placeholder="Additional notes..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? "Saving..." : "Save Transaction"}
          </button>
        </form>
      </div>
    </div>
  );
}
