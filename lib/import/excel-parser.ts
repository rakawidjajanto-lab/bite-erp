import * as XLSX from "xlsx";

export type ParsedTransaction = {
  date: string | null;
  description: string;
  category: string;
  amountIn: number | null;
  amountOut: number | null;
  // Smart routing fields
  rowType: string;
  productName: string;
  quantity: number;
  recipient: string;
  purpose: string;
  assetCategory: string;
  currentValue: number;
  subCategory: string;
};

type SupportedImportType = "excel" | "csv";

const CATEGORY_MAP: Record<string, string> = {
  investment: "INVESTMENT",
  sales: "SALES",
  supplies: "SUPPLIES",
  supply: "SUPPLIES",
  operational: "OPERATIONAL",
  operations: "OPERATIONAL",
  marketing: "MARKETING",
  rnd: "RND",
  "r&d": "RND",
  research: "RND",
  inventory: "INVENTORY",
  "other income": "OTHER_INCOME",
  otherincome: "OTHER_INCOME",
};

function normalizeCategory(raw: string): string {
  const key = (raw || "").trim().toLowerCase();
  return CATEGORY_MAP[key] ?? "OTHER_INCOME";
}

function excelSerialToDate(serial: number): string | null {
  if (!serial || isNaN(serial)) return null;
  const utc_days = Math.floor(serial - 25569);
  const date = new Date(utc_days * 86400 * 1000);
  return date.toISOString().split("T")[0];
}

function parseAmount(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(num) || num === 0 ? null : num;
}

function detectImportType(fileName: string): SupportedImportType {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  return "excel";
}

function readRows(buffer: ArrayBuffer, fileName: string): Record<string, unknown>[] {
  const importType = detectImportType(fileName);
  const workbook =
    importType === "csv"
      ? XLSX.read(new TextDecoder("utf-8").decode(buffer), { type: "string", raw: true })
      : XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
}

export function parseExcelFile(buffer: ArrayBuffer, fileName = "import.xlsx"): ParsedTransaction[] {
  const rows = readRows(buffer, fileName);
  return rows
    .map((row) => {
      const dateRaw = row["Date"] ?? row["date"] ?? row["Tanggal"];
      const description =
        String(row["Description"] ?? row["description"] ?? row["Keterangan"] ?? "").trim();
      const categoryRaw = String(row["Category"] ?? row["category"] ?? row["Kategori"] ?? "");
      const amountIn = parseAmount(
        row["Money In (Credit)"] ?? row["Money In"] ?? row["Money_In"] ?? row["money_in"] ??
        row["Amount In"] ?? row["amount_in"] ?? row["in"] ?? row["In"] ?? row["Pemasukan"]
      );
      const amountOut = parseAmount(
        row["Money Out (Debit)"] ?? row["Money Out"] ?? row["Money_Out"] ?? row["money_out"] ??
        row["Amount Out"] ?? row["amount_out"] ?? row["out"] ?? row["Out"] ?? row["Pengeluaran"]
      );

      let date: string | null = null;
      if (typeof dateRaw === "number") {
        date = excelSerialToDate(dateRaw);
      } else if (typeof dateRaw === "string" && dateRaw.trim()) {
        date = new Date(dateRaw).toISOString().split("T")[0];
      }

      const rawType = String(row["type"] ?? row["Type"] ?? "").trim().toLowerCase();
      const rowType = rawType || "transaction";

      return {
        date,
        description,
        category: normalizeCategory(categoryRaw),
        amountIn,
        amountOut,
        rowType,
        productName: String(row["productName"] ?? row["Product Name"] ?? row["product"] ?? "").trim(),
        quantity: Math.max(1, parseFloat(String(row["quantity"] ?? row["qty"] ?? row["Quantity"] ?? "1")) || 1),
        recipient: String(row["recipient"] ?? row["Recipient"] ?? "").trim(),
        purpose: String(row["purpose"] ?? row["Purpose"] ?? "other").trim().toUpperCase(),
        assetCategory: String(row["assetCategory"] ?? row["Asset Category"] ?? row["asset_category"] ?? "OTHER").trim().toUpperCase(),
        currentValue: parseFloat(String(row["currentValue"] ?? row["Current Value"] ?? row["current_value"] ?? "0").replace(/[^0-9.-]/g, "")) || 0,
        subCategory: String(row["subCategory"] ?? row["Sub Category"] ?? row["sub_category"] ?? "other").trim().toLowerCase(),
      };
    })
    .filter((r) => r.description || r.amountIn || r.amountOut);
}
