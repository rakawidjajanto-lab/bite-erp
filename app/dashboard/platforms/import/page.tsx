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

export default function PlatformImportPage() {
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

  return (
    <>
      <Topbar title="Import Platform Excel" />
      <div className="flex-1 overflow-auto p-6 max-w-xl space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Import from Platforms</h2>
          <p className="text-sm text-gray-500 mt-1">
            Upload the seller settlement Excel (.xlsx) export from Tokopedia or Shopee. The platform
            is auto-detected from the file structure.
          </p>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Tokopedia &amp; Shopee</h3>
            <span className="text-xs text-gray-400">Auto-detected from file</span>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition bg-white"
          >
            <Upload size={28} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 font-medium">Click or drag &amp; drop .xlsx file</p>
            <p className="text-xs text-gray-400 mt-1">Tokopedia income settlement · Shopee order export</p>
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
                <p className="font-medium text-gray-800">
                  Import complete{result.platform ? ` — ${result.platform}` : ""}
                </p>
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

        <div className="text-xs text-gray-400 space-y-1">
          <p className="font-medium text-gray-500">Supported formats:</p>
          <p>• <span className="font-medium text-green-700">Tokopedia</span> — Income settlement report (.xlsx, headers at row 5)</p>
          <p>• <span className="font-medium text-orange-600">Shopee</span> — Order export (.xlsx, headers at row 1)</p>
        </div>
      </div>
    </>
  );
}
