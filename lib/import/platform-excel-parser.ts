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
  feeReferenceId?: string;
  feeDescription?: string;
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

function parseTokopediaCompleted(sheet: XLSX.WorkSheet): NormalizedPlatformOrder[] {
  // Row 0 = headers, Row 1 = field descriptions, data from Row 2
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    range: 0,
    defval: "",
  });
  const dataRows = rows.slice(1); // drop the Row 1 description row

  const grouped = groupBy(dataRows, (r) => String(r["Order ID"] ?? "").trim());
  const orders: NormalizedPlatformOrder[] = [];

  for (const [orderId, group] of grouped) {
    if (!orderId) continue;
    const first = group[0];

    const status = String(first["Order Status"] ?? "").trim();
    const settlementStatus: "SETTLED" | "PENDING" = status === "Completed" ? "SETTLED" : "PENDING";

    // Order-level totals are repeated per item row; take from first row
    const grossAmount = parseNum(first["Total Order Amount"]);
    const netAmount = parseNum(first["Seller received amount"]);
    const platformFee = Math.max(0, grossAmount - netAmount);

    const items: NormalizedPlatformItem[] = group.map((r) => ({
      productName: String(r["Product Name"] ?? "").trim(),
      quantity: parseNum(r["Quantity of Product Purchased"]) || 1,
      unitPrice: parseNum(r["Product Price"]),
    }));

    orders.push({
      externalOrderId: orderId,
      orderDate: parseExcelDate(first["Order Creation Date"]) ?? new Date().toISOString().split("T")[0],
      settlementDate: parseExcelDate(first["Order Completed Time"]),
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

function parseTokopediaIncome(sheet: XLSX.WorkSheet): NormalizedPlatformOrder[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    range: 0,
    defval: "",
  });

  const orders: NormalizedPlatformOrder[] = [];

  for (const row of rows) {
    if (String(row["Transaction type"] ?? "").trim() !== "Order") continue;

    const orderId = String(row["Order/Adjustment ID"] ?? "").trim();
    if (!orderId) continue;

    const grossAmount = parseNum(row["Total Revenue"]);
    const platformFee = Math.abs(parseNum(row["Total Fees"]));
    const netAmount = parseNum(row["Total settlement amount"]);
    const productName = String(row["Details of items sold"] ?? "").trim();

    orders.push({
      externalOrderId: orderId,
      orderDate: parseExcelDate(row["Order created time"]) ?? new Date().toISOString().split("T")[0],
      settlementDate: parseExcelDate(row["Order settled time"]),
      settlementStatus: "SETTLED",
      grossAmount,
      platformFee,
      netAmount,
      feeReferenceId: `TOKOPEDIA-FEE-${orderId}`,
      feeDescription: `Tokopedia Platform Fee - ${orderId}`,
      items: productName ? [{ productName, quantity: 1, unitPrice: grossAmount }] : [],
      rawData: row,
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

function parseShopeeSettlement(workbook: XLSX.WorkBook): NormalizedPlatformOrder[] {
  const incomeSheet = workbook.Sheets["Income"];
  if (!incomeSheet) return [];

  const allRows = XLSX.utils.sheet_to_json<unknown[]>(incomeSheet, {
    header: 1,
    defval: "",
  }) as unknown[][];

  // Find header row: first row where col 0 === "No."
  const headerIdx = allRows.findIndex((r) => String((r as unknown[])[0] ?? "").trim() === "No.");
  if (headerIdx === -1) return [];
  const header = allRows[headerIdx] as unknown[];

  // Build column index map from header
  const col = (name: string) => header.findIndex((h) => String(h ?? "").trim() === name);
  const iNo       = col("No.");
  const iOrderId  = col("No. Pesanan");
  const iDate     = col("Waktu Pesanan Dibuat");
  const iSettle   = col("Tanggal Dana Dilepaskan");
  const iGross    = col("Harga Asli Produk");
  const iFee      = col("Biaya Layanan");
  const iNet      = col("Total Penghasilan");

  const orders: NormalizedPlatformOrder[] = [];

  for (const row of allRows.slice(headerIdx + 1)) {
    const r = row as unknown[];
    // Skip summary/total rows — data rows have a sequential number in the "No." column
    if (typeof r[iNo] !== "number") continue;

    const orderId = String(r[iOrderId] ?? "").trim();
    if (!orderId) continue;

    orders.push({
      externalOrderId: orderId,
      orderDate: parseExcelDate(r[iDate]) ?? new Date().toISOString().split("T")[0],
      settlementDate: parseExcelDate(r[iSettle]),
      settlementStatus: "SETTLED",
      grossAmount: parseNum(r[iGross]),
      platformFee: Math.abs(parseNum(r[iFee])),
      netAmount: parseNum(r[iNet]),
      items: [],
      rawData: { orderId },
    });
  }

  return orders;
}

function parseShopeeIncome(sheet: XLSX.WorkSheet): NormalizedPlatformOrder[] {
  // Headers at row 5, data from row 6
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    range: 5,
    defval: "",
  });

  const orders: NormalizedPlatformOrder[] = [];

  for (const row of rows) {
    const orderId = String(row["No. Pesanan"] ?? "").trim();
    if (!orderId) continue;

    const grossAmount = parseNum(row["Harga Asli Produk"]);
    const platformFee = Math.abs(parseNum(row["Biaya Layanan"]));
    const netAmount = parseNum(row["Total Penghasilan"]);

    orders.push({
      externalOrderId: orderId,
      orderDate: parseExcelDate(row["Waktu Pesanan Dibuat"]) ?? new Date().toISOString().split("T")[0],
      settlementDate: parseExcelDate(row["Tanggal Dana Dilepaskan"]),
      settlementStatus: "SETTLED",
      grossAmount,
      platformFee,
      netAmount,
      feeReferenceId: `SHOPEE-FEE-${orderId}`,
      feeDescription: `Shopee Platform Fee - ${orderId}`,
      items: [],
      rawData: row,
    });
  }

  return orders;
}

export function mergeTokopediaFiles(
  completedBuffer: ArrayBuffer,
  incomeBuffer: ArrayBuffer
): NormalizedPlatformOrder[] {
  // Completed Orders: headers at row 0, descriptions at row 1, data from row 2
  const wbC = XLSX.read(new Uint8Array(completedBuffer), { type: "array" });
  const sheetC = wbC.Sheets[wbC.SheetNames[0]];
  const completedRows = (
    XLSX.utils.sheet_to_json<unknown[]>(sheetC, { header: 1, defval: "" }) as unknown[][]
  ).slice(2);

  type CompletedItem = { productName: string; qty: number; unitPrice: number; orderAmount: number; createdTime: unknown };
  const itemsByOrder = new Map<string, CompletedItem[]>();

  for (const row of completedRows) {
    const r = row as unknown[];
    const orderId = String(r[0] ?? "").trim();
    if (!orderId) continue;
    const arr = itemsByOrder.get(orderId) ?? [];
    arr.push({
      productName: String(r[7] ?? "").trim(),
      qty: parseNum(r[9]) || 1,
      unitPrice: parseNum(r[11]),
      orderAmount: parseNum(r[28]),
      createdTime: r[29],
    });
    itemsByOrder.set(orderId, arr);
  }

  // Income Settlement: headers at row 0, data from row 1
  const wbI = XLSX.read(new Uint8Array(incomeBuffer), { type: "array" });
  const sheetI = wbI.Sheets[wbI.SheetNames[0]];
  const incomeRows = (
    XLSX.utils.sheet_to_json<unknown[]>(sheetI, { header: 1, defval: "" }) as unknown[][]
  ).slice(1);

  const orders: NormalizedPlatformOrder[] = [];

  for (const row of incomeRows) {
    const r = row as unknown[];
    if (String(r[1] ?? "").trim() !== "Order") continue;

    const orderId = String(r[0] ?? "").trim();
    if (!orderId) continue;

    const netAmount = parseNum(r[5]);
    const platformFee = Math.abs(parseNum(r[14]));
    const settlementDate = parseExcelDate(r[3]);

    const completedItems = itemsByOrder.get(orderId) ?? [];
    const grossAmount = completedItems[0]?.orderAmount ?? netAmount;
    const orderDate =
      parseExcelDate(completedItems[0]?.createdTime) ?? new Date().toISOString().split("T")[0];

    orders.push({
      externalOrderId: orderId,
      orderDate,
      settlementDate,
      settlementStatus: "SETTLED",
      grossAmount,
      platformFee,
      netAmount,
      feeReferenceId: `TOKOPEDIA-FEE-${orderId}`,
      feeDescription: `Tokopedia Platform Fee - ${orderId}`,
      items: completedItems.map((it) => ({
        productName: it.productName,
        quantity: it.qty,
        unitPrice: it.unitPrice,
      })),
      rawData: { orderId, netAmount, platformFee, settlementDate },
    });
  }

  return orders;
}

export function parsePlatformExcel(buffer: ArrayBuffer): {
  platform: "tokopedia" | "shopee";
  orders: NormalizedPlatformOrder[];
} {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });

  // Shopee Settlement: lives in the "Summary" sheet, identified by a "Laporan Penghasilan" label row
  const summarySheet = workbook.Sheets["Summary"];
  if (summarySheet) {
    const summaryRows = XLSX.utils.sheet_to_json<unknown[]>(summarySheet, {
      header: 1,
      defval: "",
    }) as unknown[][];
    if (summaryRows.some((r) => String((r as unknown[])[0] ?? "").trim() === "Laporan Penghasilan")) {
      return { platform: "shopee", orders: parseShopeeSettlement(workbook) };
    }
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  }) as unknown[][];

  const row0Col0 = String(allRows[0]?.[0] ?? "").trim();
  const row0Col1 = String(allRows[0]?.[1] ?? "").trim();
  const row0Col5 = String(allRows[0]?.[5] ?? "").trim();
  const row1Col0 = String(allRows[1]?.[0] ?? "").trim();
  const row0Headers = allRows[0] ?? [];
  const row4Headers = allRows[4] ?? [];

  console.log("[platform-detect] row0:", JSON.stringify(allRows[0]?.slice(0, 6)));
  console.log("[platform-detect] row5:", JSON.stringify(allRows[5]?.slice(0, 4)));
  console.log("[platform-detect] row0col0 bytes:", [...String(allRows[0]?.[0] ?? "")].map((c) => c.charCodeAt(0)));
  console.log("[platform-detect] row5col1 bytes:", [...String(allRows[5]?.[1] ?? "")].map((c) => c.charCodeAt(0)));

  const isShopeeIncome = row0Col0 === "Username (Penjual)" && String(allRows[5]?.[1] ?? "").trim() === "No. Pesanan";
  const isTokopediaIncome = row0Col0 === "Order/Adjustment ID" && row0Col1 === "Transaction type" && row0Col5 === "Total settlement amount";
  const isTokopediaCompleted = row0Col0 === "Order ID" && row1Col0 === "Platform unique order ID.";
  const hasShopeeHeader = row0Headers.some((h) => String(h).includes("No. Pesanan"));
  const hasTokopediaHeader = row4Headers.some((h) => String(h).includes("Order/Adjustment ID"));

  if (isShopeeIncome) {
    return { platform: "shopee", orders: parseShopeeIncome(sheet) };
  }
  if (isTokopediaIncome) {
    return { platform: "tokopedia", orders: parseTokopediaIncome(sheet) };
  }
  if (isTokopediaCompleted) {
    return { platform: "tokopedia", orders: parseTokopediaCompleted(sheet) };
  }
  if (hasTokopediaHeader) {
    return { platform: "tokopedia", orders: parseTokopedia(sheet) };
  }
  if (hasShopeeHeader) {
    return { platform: "shopee", orders: parseShopee(sheet) };
  }

  throw new Error(
    "Unrecognized file format. Expected Tokopedia income report, Tokopedia completed orders, Shopee order export, or Shopee income per order."
  );
}
