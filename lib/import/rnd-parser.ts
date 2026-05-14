import * as XLSX from "xlsx";

export type ParsedRndExpense = {
  projectName: string;
  date: string;
  description: string;
  subCategory: string;
  amount: number;
};

const SUBCATEGORY_MAP: Record<string, string> = {
  ingredients: "ingredients",
  ingredient: "ingredients",
  equipment: "equipment",
  testing: "testing",
  test: "testing",
  labor: "labor",
  labour: "labor",
  other: "other",
};

function normalizeSubCategory(raw: string): string {
  const key = (raw || "").trim().toLowerCase();
  return SUBCATEGORY_MAP[key] ?? "other";
}

function excelSerialToDate(serial: number): string {
  const utc_days = Math.floor(serial - 25569);
  return new Date(utc_days * 86400 * 1000).toISOString().split("T")[0];
}

function parseDate(raw: unknown): string {
  if (typeof raw === "number") return excelSerialToDate(raw);
  if (typeof raw === "string" && raw.trim()) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  return new Date().toISOString().split("T")[0];
}

function parseAmount(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? 0 : Math.abs(num);
}

export function parseRndCsv(buffer: ArrayBuffer, fileName = "import.csv"): ParsedRndExpense[] {
  const isCSV = fileName.toLowerCase().endsWith(".csv");
  const workbook = isCSV
    ? XLSX.read(new TextDecoder("utf-8").decode(buffer), { type: "string", raw: true })
    : XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  return rows
    .map((row) => ({
      projectName: String(row["projectName"] ?? row["project_name"] ?? row["Project Name"] ?? row["project"] ?? row["Project"] ?? "").trim(),
      date: parseDate(row["date"] ?? row["Date"] ?? row["Tanggal"]),
      description: String(row["description"] ?? row["Description"] ?? row["Keterangan"] ?? "").trim(),
      subCategory: normalizeSubCategory(String(row["subCategory"] ?? row["Sub Category"] ?? row["category"] ?? row["Category"] ?? "other")),
      amount: parseAmount(row["amount"] ?? row["Amount"] ?? row["cost"] ?? row["Cost"]),
    }))
    .filter((r) => r.description && r.amount > 0);
}
