"use client";

import { useState, useRef } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";

type Result = {
  platform: string;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors?: string[];
  error?: string;
};

function PlatformImporter({
  label,
  color,
}: {
  label: "Tokopedia" | "Shopee";
  color: "green" | "orange";
}) {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import/platform", { method: "POST", body: formData });
      const data: Result = await res.json();
      setResult(data);
    } catch {
      setResult({ platform: "", imported: 0, updated: 0, skipped: 0, failed: 1, error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  const borderColor = color === "green" ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50";
  const textColor = color === "green" ? "text-green-700" : "text-orange-700";

  return (
    <div className={`rounded-xl border-2 p-5 space-y-3 ${borderColor}`}>
      <div className="flex items-center justify-between">
        <h3 className={`font-semibold ${textColor}`}>{label}</h3>
        <span className="text-xs text-gray-400">Upload seller Excel export</span>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition bg-white"
      >
        <Upload size={24} className="mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">Click to upload {label} .xlsx</p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {loading && (
        <p className="text-sm text-gray-500 text-center animate-pulse">
          Processing {fileName}...
        </p>
      )}

      {result && !result.error && (
        <div className="flex items-start gap-2 bg-white p-3 rounded-lg text-sm border border-gray-100">
          <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-gray-800">Import complete</p>
            <p className="text-gray-500">
              {result.imported} imported · {result.updated} updated · {result.skipped} skipped ·{" "}
              {result.failed} failed
            </p>
            {result.errors && result.errors.length > 0 && (
              <ul className="mt-1 text-xs text-red-500 space-y-0.5">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {result?.error && (
        <div className="flex items-start gap-2 bg-red-50 p-3 rounded-lg text-sm border border-red-100">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-red-700">Import failed</p>
            <p className="text-red-500 text-xs mt-0.5">{result.error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlatformImportPage() {
  return (
    <>
      <Topbar title="Import Platform Excel" />
      <div className="flex-1 overflow-auto p-6 max-w-xl space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Import from Platforms</h2>
          <p className="text-sm text-gray-500 mt-1">
            Download the income settlement Excel export from your Tokopedia or Shopee seller
            dashboard, then upload it here.
          </p>
        </div>
        <PlatformImporter label="Tokopedia" color="green" />
        <PlatformImporter label="Shopee" color="orange" />
      </div>
    </>
  );
}
