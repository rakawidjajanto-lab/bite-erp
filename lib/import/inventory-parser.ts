import * as XLSX from "xlsx";

export type ParsedInventoryRow = {
  productName: string;
  quantity: number;
  unit: string;
  costPrice: number;
  notes: string;
};

function parseNum(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : Math.abs(n);
}

export function parseInventoryCsv(buffer: ArrayBuffer, fileName = "import.csv"): ParsedInventoryRow[] {
  const isCSV = fileName.toLowerCase().endsWith(".csv");
  const workbook = isCSV
    ? XLSX.read(new TextDecoder("utf-8").decode(buffer), { type: "string", raw: true })
    : XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  return rows
    .map((row) => ({
      productName: String(row["productName"] ?? row["Product Name"] ?? row["product"] ?? row["Product"] ?? "").trim(),
      quantity: Math.max(0, parseNum(row["quantity"] ?? row["Quantity"] ?? row["qty"] ?? row["Qty"])),
      unit: String(row["unit"] ?? row["Unit"] ?? "pcs").trim() || "pcs",
      costPrice: parseNum(row["costPrice"] ?? row["Cost Price"] ?? row["cost_price"] ?? row["cost"] ?? row["Cost"]),
      notes: String(row["notes"] ?? row["Notes"] ?? "").trim(),
    }))
    .filter((r) => r.productName && r.quantity > 0);
}
