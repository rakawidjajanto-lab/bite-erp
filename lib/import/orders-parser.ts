import * as XLSX from "xlsx";

export type ParsedOrderRow = {
  orderRef: string;
  date: string;
  customerName: string;
  productName: string;
  flavorName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  deliveryFee: number;
  notes: string;
};

function parseNum(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : Math.abs(n);
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

export function parseOrdersCsv(buffer: ArrayBuffer, fileName = "import.csv"): ParsedOrderRow[] {
  const isCSV = fileName.toLowerCase().endsWith(".csv");
  const workbook = isCSV
    ? XLSX.read(new TextDecoder("utf-8").decode(buffer), { type: "string", raw: true })
    : XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  return rows
    .map((row) => ({
      orderRef: String(row["orderRef"] ?? row["order_ref"] ?? row["Order Ref"] ?? "").trim(),
      date: parseDate(row["date"] ?? row["Date"]),
      customerName: String(row["customerName"] ?? row["customer_name"] ?? row["Customer Name"] ?? row["customer"] ?? row["Customer"] ?? "").trim(),
      productName: String(row["productName"] ?? row["product_name"] ?? row["Product Name"] ?? row["product"] ?? row["Product"] ?? "").trim(),
      flavorName: String(row["flavorName"] ?? row["flavor_name"] ?? row["Flavor Name"] ?? row["flavor"] ?? row["Flavor"] ?? "").trim(),
      size: String(row["size"] ?? row["Size"] ?? "").trim(),
      quantity: Math.max(1, Math.round(parseNum(row["quantity"] ?? row["Quantity"] ?? row["qty"] ?? row["Qty"]))),
      unitPrice: parseNum(row["unitPrice"] ?? row["unit_price"] ?? row["Unit Price"] ?? row["price"] ?? row["Price"]),
      deliveryFee: parseNum(row["deliveryFee"] ?? row["delivery_fee"] ?? row["Delivery Fee"] ?? row["delivery"] ?? row["Delivery"]),
      notes: String(row["notes"] ?? row["Notes"] ?? "").trim(),
    }))
    .filter((r) => r.customerName && r.productName && r.size);
}
