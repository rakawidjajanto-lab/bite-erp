import * as XLSX from "xlsx";

export type ParsedGiveawayRow = {
  date: string;
  recipient: string;
  purpose: string;
  productName: string;
  quantity: number;
  notes: string;
};

const PURPOSE_MAP: Record<string, string> = {
  endorsement: "ENDORSEMENT",
  sampling: "SAMPLING",
  sample: "SAMPLING",
  event: "EVENT",
  other: "OTHER",
};

function normalizePurpose(raw: string): string {
  const key = (raw || "").trim().toLowerCase();
  return PURPOSE_MAP[key] ?? "OTHER";
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

export function parseMarketingCsv(buffer: ArrayBuffer, fileName = "import.csv"): ParsedGiveawayRow[] {
  const isCSV = fileName.toLowerCase().endsWith(".csv");
  const workbook = isCSV
    ? XLSX.read(new TextDecoder("utf-8").decode(buffer), { type: "string", raw: true })
    : XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  return rows
    .map((row) => ({
      date: parseDate(row["date"] ?? row["Date"]),
      recipient: String(row["recipient"] ?? row["Recipient"] ?? row["influencer"] ?? "").trim(),
      purpose: normalizePurpose(String(row["purpose"] ?? row["Purpose"] ?? "other")),
      productName: String(row["productName"] ?? row["Product Name"] ?? row["product"] ?? row["Product"] ?? "").trim(),
      quantity: Math.max(1, parseInt(String(row["quantity"] ?? row["qty"] ?? row["Quantity"] ?? "1")) || 1),
      notes: String(row["notes"] ?? row["Notes"] ?? "").trim(),
    }))
    .filter((r) => r.recipient && r.productName);
}
