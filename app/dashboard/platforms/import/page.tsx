"use client";

import { useState, useRef } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Upload, CheckCircle2 } from "lucide-react";

type Result = { imported: number; skipped: number; failed: number };

function CSVImporter({ platform, endpoint }: { platform: "Tokopedia" | "Shopee"; endpoint: string }) {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvText = e.target?.result as string;
      const lines = csvText.trim().split("\n").length - 1;
      setRowCount(lines);
      setLoading(true);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      setResult(data);
      setLoading(false);
    };
    reader.readAsText(file);
  }

  const color = platform === "Tokopedia" ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200";
  const textColor = platform === "Tokopedia" ? "text-green-700" : "text-orange-700";

  return (
    <div className={`rounded-xl border-2 p-5 space-y-3 ${color}`}>
      <div className="flex items-center justify-between">
        <h3 className={`font-semibold ${textColor}`}>{platform}</h3>
        <span className="text-xs text-gray-400">Upload seller CSV export</span>
      </div>
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition bg-white"
      >
        <Upload size={24} className="mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">Click to upload {platform} CSV</p>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      {loading && <p className="text-sm text-gray-500 text-center">Processing {rowCount} rows...</p>}

      {result && (
        <div className="flex items-start gap-2 bg-white p-3 rounded-lg text-sm">
          <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-gray-800">Import complete</p>
            <p className="text-gray-500">{result.imported} imported · {result.skipped} skipped · {result.failed} failed</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlatformImportPage() {
  return (
    <>
      <Topbar title="Import Platform CSV" />
      <div className="flex-1 overflow-auto p-6 max-w-xl space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Import from Platforms</h2>
          <p className="text-sm text-gray-500 mt-1">
            Download the sales/income report CSV from your Tokopedia or Shopee seller dashboard, then upload it here.
          </p>
        </div>
        <CSVImporter platform="Tokopedia" endpoint="/api/import/tokopedia" />
        <CSVImporter platform="Shopee" endpoint="/api/import/shopee" />
      </div>
    </>
  );
}
