"use client";

import { useState, useRef } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Upload, CheckCircle2, AlertCircle, FileCheck } from "lucide-react";

type Result = {
  platform: string;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors?: string[];
  error?: string;
};

function FileDropZone({
  label,
  selected,
  onFile,
}: {
  label: string;
  selected: string | null;
  onFile: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition bg-white"
    >
      {selected ? (
        <div className="flex items-center justify-center gap-2 text-sm text-green-700">
          <FileCheck size={16} />
          <span className="truncate max-w-[220px]">{selected}</span>
        </div>
      ) : (
        <>
          <Upload size={18} className="mx-auto text-gray-400 mb-1" />
          <p className="text-xs text-gray-500">{label}</p>
        </>
      )}
      <input
        ref={ref}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function ResultPanel({ result }: { result: Result }) {
  if (result.error) {
    return (
      <div className="flex items-start gap-2 bg-red-50 p-3 rounded-lg text-sm border border-red-100">
        <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-red-700">Import failed</p>
          <p className="text-red-500 text-xs mt-0.5">{result.error}</p>
        </div>
      </div>
    );
  }
  return (
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
            {result.errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

function TokopediaImporter() {
  const [completedFile, setCompletedFile] = useState<File | null>(null);
  const [incomeFile, setIncomeFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleImport() {
    if (!completedFile || !incomeFile) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("completedFile", completedFile);
    formData.append("incomeFile", incomeFile);

    try {
      const res = await fetch("/api/import/platform", { method: "POST", body: formData });
      setResult(await res.json());
    } catch {
      setResult({ platform: "Tokopedia", imported: 0, updated: 0, skipped: 0, failed: 1, error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border-2 p-5 space-y-3 border-green-200 bg-green-50">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-green-700">Tokopedia</h3>
        <span className="text-xs text-gray-400">Upload two files to merge</span>
      </div>

      <FileDropZone
        label="Upload Completed Orders .xlsx"
        selected={completedFile?.name ?? null}
        onFile={setCompletedFile}
      />
      <FileDropZone
        label="Upload Income Settlement .xlsx"
        selected={incomeFile?.name ?? null}
        onFile={setIncomeFile}
      />

      <button
        onClick={handleImport}
        disabled={!completedFile || !incomeFile || loading}
        className="w-full bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
      >
        {loading ? "Importing…" : "Import"}
      </button>

      {result && <ResultPanel result={result} />}
    </div>
  );
}

function ShopeeImporter() {
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
      setResult(await res.json());
    } catch {
      setResult({ platform: "Shopee", imported: 0, updated: 0, skipped: 0, failed: 1, error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border-2 p-5 space-y-3 border-orange-200 bg-orange-50">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-orange-700">Shopee</h3>
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
        <p className="text-sm text-gray-600">Click to upload Shopee .xlsx</p>
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
        <p className="text-sm text-gray-500 text-center animate-pulse">Processing {fileName}…</p>
      )}

      {result && <ResultPanel result={result} />}
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
            Upload your Tokopedia Completed Orders and Income Settlement files together, or upload a
            Shopee export.
          </p>
        </div>
        <TokopediaImporter />
        <ShopeeImporter />
      </div>
    </>
  );
}
