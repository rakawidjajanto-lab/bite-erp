import * as XLSX from "xlsx";

export type NormalizedPlatformItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type NormalizedPlatformOrder = {
  externalOrderId: string;
  orderDate: string;
  settlementDate: string | null;
  settlementStatus: "SETTLED" | "PENDING";
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  customerName?: string;
  description?: string;
  items: NormalizedPlatformItem[];
  rawData: Record<string, unknown>;
};

function parseNum(val: unknown): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  return parseFloat(String(val).replace(/[^0-9.-]/g, "")) || 0;
}

// Shopee exports use dot as thousand separator (e.g. "83.500" = 83500).
// Strip all dots before parsing to avoid treating them as decimal points.
function parseShopeeNum(val: unknown): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  return parseInt(String(val).replace(/\./g, ""), 10) || 0;
}

function parseExcelDate(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "number") {
    const date = XLSX.SSF.parse_date_code(val);
    if (!date) return null;
    const y = date.y;
    const m = String(date.m).padStart(2, "0");
    const d = String(date.d).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  if (!s) return null;
  const parsed = new Date(s);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split("T")[0];
}

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    if (!k) continue;
    const arr = map.get(k) ?? [];
    arr.push(row);
    map.set(k, arr);
  }
  return map;
}

function parseTokopedia(sheet: XLSX.WorkSheet): NormalizedPlatformOrder[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    range: 4,
    defval: "",
  });

  const grouped = groupBy(rows, (r) => String(r["Order/Adjustment ID"] ?? "").trim());
  const orders: NormalizedPlatformOrder[] = [];

  for (const [orderId, group] of grouped) {
    if (!orderId) continue;
    const first = group[0];

    const unsettledReasons = String(first["Unsettled reasons"] ?? "").toLowerCase();
    const settlementStatus: "SETTLED" | "PENDING" = unsettledReasons.includes("awaiting settlement")
      ? "PENDING"
      : "SETTLED";

    const grossAmount = group.reduce((s, r) => s + parseNum(r["Total Revenue"]), 0);
    const platformFee = group.reduce(
      (s, r) =>
        s +
        parseNum(r["Est. platform commission"]) +
        parseNum(r["Dynamic commission"]) +
        parseNum(r["Order processing fee"]) +
        parseNum(r["Shipping costs passed on to the logistics provider"]),
      0
    );
    const netAmount = group.reduce((s, r) => s + parseNum(r["Estimated settlement amount"]), 0);

    const items: NormalizedPlatformItem[] = group.map((r) => {
      const qty = parseNum(r["Quantity"]) || 1;
      const revenue = parseNum(r["Total Revenue"]);
      return {
        productName: String(r["Product name"] ?? "").trim(),
        quantity: qty,
        unitPrice: revenue / qty,
      };
    });

    orders.push({
      externalOrderId: orderId,
      orderDate: parseExcelDate(first["Transaction created date"]) ?? new Date().toISOString().split("T")[0],
      settlementDate: parseExcelDate(first["Estimated settlement time"]),
      settlementStatus,
      grossAmount,
      platformFee,
      netAmount,
      items,
      rawData: first,
    });
  }

  return orders;
}

function parseShopee(sheet: XLSX.WorkSheet): NormalizedPlatformOrder[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    range: 0,
    defval: "",
  });

  const grouped = groupBy(rows, (r) => String(r["No. Pesanan"] ?? "").trim());
  const orders: NormalizedPlatformOrder[] = [];

  for (const [orderId, group] of grouped) {
    if (!orderId) continue;
    const first = group[0];

    const status = String(first["Status Pesanan"] ?? "").trim();
    const settlementStatus: "SETTLED" | "PENDING" = status === "Selesai" ? "SETTLED" : "PENDING";

    const grossAmount = group.reduce((s, r) => s + parseShopeeNum(r["Harga Setelah Diskon"]), 0);
    const platformFee = group.reduce(
      (s, r) =>
        s +
        parseShopeeNum(r["Voucher Ditanggung Penjual"]) +
        parseShopeeNum(r["Diskon Dari Penjual"]),
      0
    );
    const netAmount = group.reduce(
      (s, r) =>
        s +
        parseShopeeNum(r["Total Pembayaran"]) -
        parseShopeeNum(r["Diskon Dari Penjual"]) -
        parseShopeeNum(r["Voucher Ditanggung Penjual"]),
      0
    );

    const items: NormalizedPlatformItem[] = group.map((r) => {
      const qty = parseShopeeNum(r["Jumlah"]) || 1;
      const price = parseShopeeNum(r["Harga Setelah Diskon"]);
      return {
        productName: String(r["Nama Produk"] ?? "").trim(),
        quantity: qty,
        unitPrice: price / qty,
      };
    });

    const settlementDateRaw = first["Waktu Pesanan Selesai"];
    const settlementDate = settlementDateRaw ? parseExcelDate(settlementDateRaw) : null;

    orders.push({
      externalOrderId: orderId,
      orderDate: parseExcelDate(first["Waktu Pesanan Dibuat"]) ?? new Date().toISOString().split("T")[0],
      settlementDate,
      settlementStatus,
      grossAmount,
      platformFee,
      netAmount,
      customerName: String(first["Username (Pembeli)"] ?? "").trim() || undefined,
      items,
      rawData: first,
    });
  }

  return orders;
}

function parseShopeeSettlement(allRows: unknown[][]): NormalizedPlatformOrder[] {
  const startDateRaw = allRows[6]?.[1];
  const endDateRaw = allRows[7]?.[1];
  const grossAmount = Math.abs(parseNum(allRows[10]?.[3]));
  const platformFee = Math.abs(parseNum(allRows[33]?.[3]));
  const netAmount = Math.abs(parseNum(allRows[47]?.[3]));

  const startDate = parseExcelDate(startDateRaw) ?? new Date().toISOString().split("T")[0];
  const endDate = parseExcelDate(endDateRaw) ?? startDate;

  const externalOrderId = `SETTLEMENT-${startDate}-to-${endDate}`;

  return [
    {
      externalOrderId,
      orderDate: startDate,
      settlementDate: endDate,
      settlementStatus: "SETTLED",
      grossAmount,
      platformFee,
      netAmount,
      description: `Shopee Income Settlement ${startDate} – ${endDate}`,
      items: [],
      rawData: { startDate, endDate, grossAmount, platformFee, netAmount },
    },
  ];
}

export function parsePlatformExcel(buffer: ArrayBuffer): {
  platform: "tokopedia" | "shopee";
  orders: NormalizedPlatformOrder[];
} {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  }) as unknown[][];

  const row0Col0 = String(allRows[0]?.[0] ?? "").trim();
  const row0Headers = allRows[0] ?? [];
  const row4Headers = allRows[4] ?? [];

  const isShopeeSettlement = row0Col0 === "Laporan Penghasilan";
  const hasShopeeHeader = row0Headers.some((h) => String(h).includes("No. Pesanan"));
  const hasTokopediaHeader = row4Headers.some((h) => String(h).includes("Order/Adjustment ID"));

  if (isShopeeSettlement) {
    return { platform: "shopee", orders: parseShopeeSettlement(allRows) };
  }
  if (hasTokopediaHeader) {
    return { platform: "tokopedia", orders: parseTokopedia(sheet) };
  }
  if (hasShopeeHeader) {
    return { platform: "shopee", orders: parseShopee(sheet) };
  }

  throw new Error(
    "Unrecognized file format. Expected Tokopedia (row 5 'Order/Adjustment ID'), Shopee order export (row 1 'No. Pesanan'), or Shopee settlement (row 1 'Laporan Penghasilan')."
  );
}
