import * as XLSX from "xlsx";

export type ParsedAssetRow = {
  name: string;
  category: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  notes: string;
};

const CATEGORY_MAP: Record<string, string> = {
  machine: "MACHINE",
  freezer: "FREEZER",
  furniture: "FURNITURE",
  vehicle: "VEHICLE",
  electronics: "ELECTRONICS",
  other: "OTHER",
};

function normalizeCategory(raw: string): string {
  return CATEGORY_MAP[(raw || "").trim().toLowerCase()] ?? "OTHER";
}

function excelSerialToDate(serial: number): string {
  return new Date(Math.floor(serial - 25569) * 86400 * 1000).toISOString().split("T")[0];
}

function parseDate(raw: unknown): string {
  if (typeof raw === "number") return excelSerialToDate(raw);
  if (typeof raw === "string" && raw.trim()) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  return new Date().toISOString().split("T")[0];
}

function parseNum(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : Math.abs(n);
}

export function parseAssetsCsv(buffer: ArrayBuffer, fileName = "import.csv"): ParsedAssetRow[] {
  const isCSV = fileName.toLowerCase().endsWith(".csv");
  const workbook = isCSV
    ? XLSX.read(new TextDecoder("utf-8").decode(buffer), { type: "string", raw: true })
    : XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  return rows
    .map((row) => {
      const purchasePrice = parseNum(row["purchasePrice"] ?? row["Purchase Price"] ?? row["purchase_price"] ?? row["price"] ?? row["Price"]);
      const currentValue = parseNum(row["currentValue"] ?? row["Current Value"] ?? row["current_value"] ?? row["value"] ?? row["Value"]);
      return {
        name: String(row["name"] ?? row["Name"] ?? row["assetName"] ?? row["Asset Name"] ?? "").trim(),
        category: normalizeCategory(String(row["category"] ?? row["Category"] ?? "other")),
        purchaseDate: parseDate(row["purchaseDate"] ?? row["Purchase Date"] ?? row["purchase_date"] ?? row["date"] ?? row["Date"]),
        purchasePrice,
        currentValue: currentValue > 0 ? currentValue : purchasePrice,
        notes: String(row["notes"] ?? row["Notes"] ?? "").trim(),
      };
    })
    .filter((r) => r.name && r.purchasePrice > 0);
}
