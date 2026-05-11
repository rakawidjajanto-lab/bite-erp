import { Topbar } from "@/components/layout/Topbar";
import { ExcelImporter } from "@/components/import/ExcelImporter";

export default function ImportPage() {
  return (
    <>
      <Topbar title="Import Excel" />
      <div className="flex-1 overflow-auto p-6 max-w-3xl">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Import from Excel</h2>
          <p className="text-sm text-gray-500 mt-1">
            Upload your BITE Financials Tracker Excel file. The importer will preview the data before
            saving — no data is overwritten without your confirmation.
          </p>
        </div>
        <ExcelImporter />
      </div>
    </>
  );
}
