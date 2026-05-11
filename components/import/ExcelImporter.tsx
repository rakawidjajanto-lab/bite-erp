"use client";

import { useState, useRef } from "react";
import { parseExcelFile, type ParsedTransaction } from "@/lib/import/excel-parser";
import { formatIDR } from "@/lib/formatters/currency";
import { CATEGORY_LABELS, CATEGORY_COLORS, type TransactionCategory } from "@/types";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";

type ImportResult = { imported: number; skipped: number; failed: number };

export function ExcelImporter() {
  const [rows, setRows] = useState<ParsedTransaction[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setResult(null);
    setError("");
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const parsed = parseExcelFile(buffer);
        setRows(parsed);
      } catch (err) {
        setError(String(err));
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    setImporting(true);
    setError("");
    try {
      const res = await fetch("/api/transactions/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      setResult(data);
      setRows([]);
    } catch (err) {
      setError(String(err));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
      >
        <Upload size={32} className="mx-auto text-gray-400 mb-3" />
        <p className="text-sm font-medium text-gray-700">
          Click to upload or drag & drop your Excel file
        </p>
        <p className="text-xs text-gray-400 mt-1">Supports .xlsx files</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {result && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 p-4 rounded-xl text-sm">
          <CheckCircle2 size={18} />
          <div>
            <p className="font-semibold">Import complete!</p>
            <p>
              {result.imported} imported &middot; {result.skipped} skipped (duplicates) &middot;{" "}
              {result.failed} failed
            </p>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Preview: {rows.length} rows from <span className="font-semibold">{fileName}</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Scroll to review. Duplicate rows will be automatically skipped.
              </p>
            </div>
            <button
              onClick={handleImport}
              disabled={importing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {importing ? "Importing..." : `Import ${rows.length} rows`}
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Description</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Category</th>
                  <th className="text-right py-3 px-4 text-green-600 font-medium">In</th>
                  <th className="text-right py-3 px-4 text-red-500 font-medium">Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-2.5 px-4 text-gray-500 whitespace-nowrap text-xs">
                      {row.date ?? "—"}
                    </td>
                    <td className="py-2.5 px-4 text-gray-900 max-w-xs truncate">{row.description}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{
                          backgroundColor:
                            CATEGORY_COLORS[row.category as TransactionCategory] ?? "#94a3b8",
                        }}
                      >
                        {CATEGORY_LABELS[row.category as TransactionCategory] ?? row.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-green-600 text-xs">
                      {row.amountIn ? formatIDR(row.amountIn) : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right text-red-500 text-xs">
                      {row.amountOut ? formatIDR(row.amountOut) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
