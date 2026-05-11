export type NormalizedOrder = {
  externalOrderId: string;
  orderDate: string;
  status: string;
  grossAmount: number;
  platformFee: number;
  shippingCost: number;
  discount: number;
  netAmount: number;
  customerName?: string;
  rawData: Record<string, unknown>;
};

export function parseCSVText(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) ?? [];
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? "").replace(/^"|"$/g, "").trim();
    });
    return row;
  });
}

function parseRupiah(val: string): number {
  return parseFloat(val.replace(/[^0-9.-]/g, "")) || 0;
}

function normalizeStatus(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("batal") || s.includes("cancel")) return "CANCELLED";
  if (s.includes("retur") || s.includes("return")) return "RETURNED";
  if (s.includes("kirim") || s.includes("ship")) return "SHIPPED";
  if (s.includes("selesai") || s.includes("complet") || s.includes("deliver")) return "DELIVERED";
  if (s.includes("proses") || s.includes("process")) return "PROCESSING";
  return "PENDING";
}

export function normalizeTokopediaRow(row: Record<string, string>): NormalizedOrder | null {
  const orderId = row["No. Pesanan"] ?? row["Order ID"] ?? row["No Pesanan"];
  if (!orderId) return null;

  const dateRaw = row["Tanggal Pesanan"] ?? row["Order Date"] ?? "";
  const orderDate = dateRaw
    ? new Date(dateRaw).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  return {
    externalOrderId: orderId.trim(),
    orderDate,
    status: normalizeStatus(row["Status Pesanan"] ?? row["Order Status"] ?? ""),
    grossAmount: parseRupiah(row["Total Harga Produk"] ?? row["Gross Amount"] ?? "0"),
    platformFee: parseRupiah(row["Biaya Admin"] ?? row["Platform Fee"] ?? "0"),
    shippingCost: parseRupiah(row["Biaya Pengiriman Awal"] ?? row["Shipping Cost"] ?? "0"),
    discount: parseRupiah(row["Diskon Tokopedia"] ?? row["Discount"] ?? "0"),
    netAmount: parseRupiah(row["Pendapatan Bersih"] ?? row["Net Income"] ?? "0"),
    customerName: row["Nama Pembeli"] ?? row["Buyer Name"] ?? undefined,
    rawData: row,
  };
}

export function normalizeShopeeRow(row: Record<string, string>): NormalizedOrder | null {
  const orderId = row["Order ID"] ?? row["No. Pesanan"];
  if (!orderId) return null;

  const dateRaw = row["Order Creation Date"] ?? row["Tanggal Pesanan Dibuat"] ?? "";
  const orderDate = dateRaw
    ? new Date(dateRaw).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  return {
    externalOrderId: orderId.trim(),
    orderDate,
    status: normalizeStatus(row["Order Status"] ?? row["Status Pesanan"] ?? ""),
    grossAmount: parseRupiah(row["Original Price"] ?? row["Harga Asli"] ?? "0"),
    platformFee: parseRupiah(row["Transaction Fee"] ?? row["Service Fee"] ?? "0"),
    shippingCost: parseRupiah(row["Estimated Shipping Fee"] ?? "0"),
    discount: parseRupiah(row["Shopee Discount"] ?? row["Seller Discount"] ?? "0"),
    netAmount: parseRupiah(row["Net Income"] ?? row["Pendapatan Bersih"] ?? "0"),
    customerName: row["Username (Buyer)"] ?? row["Nama Pembeli"] ?? undefined,
    rawData: row,
  };
}
