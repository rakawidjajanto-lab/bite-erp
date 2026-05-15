import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type ImportRow = {
  date: string | null;
  description: string;
  category: string;
  amountIn: number | null;
  amountOut: number | null;
  rowType?: string;
  productName?: string;
  quantity?: number;
  recipient?: string;
  purpose?: string;
  assetCategory?: string;
  currentValue?: number;
  subCategory?: string;
};

async function handleInventory(row: ImportRow): Promise<boolean> {
  const productName = row.productName?.trim();
  if (!productName) return false;

  const product = await prisma.product.findFirst({
    where: { name: { equals: productName, mode: "insensitive" } },
    select: { id: true },
  });
  if (!product) return false;

  const qty = row.quantity ?? 1;
  const existing = await prisma.inventory.findFirst({ where: { productId: product.id, flavorId: null } });
  if (existing) {
    await prisma.inventory.update({ where: { id: existing.id }, data: { quantity: { increment: qty } } });
  } else {
    await prisma.inventory.create({ data: { productId: product.id, flavorId: null, quantity: qty } });
  }
  await prisma.inventoryMovement.create({
    data: {
      productId: product.id,
      flavorId: null,
      movementType: "RESTOCK",
      quantityChange: qty,
      notes: `CSV import: ${row.description}`,
    },
  });

  const cost = row.amountOut ?? 0;
  if (cost > 0) {
    await prisma.transaction.create({
      data: {
        date: row.date ? new Date(row.date) : new Date(),
        description: `Restock: ${productName}`,
        category: "SUPPLIES",
        amountOut: cost,
        source: "EXCEL_IMPORT",
      },
    });
  }

  return true;
}

async function handleAsset(row: ImportRow): Promise<boolean> {
  const purchasePrice = row.amountOut ?? row.amountIn ?? 0;
  const currentValue = row.currentValue && row.currentValue > 0 ? row.currentValue : purchasePrice;
  const validCategories = ["MACHINE", "FREEZER", "FURNITURE", "VEHICLE", "ELECTRONICS", "OTHER"];
  const category = validCategories.includes(row.assetCategory ?? "") ? row.assetCategory! : "OTHER";

  await prisma.physicalAsset.create({
    data: {
      name: row.description || "Imported Asset",
      category: category as "MACHINE" | "FREEZER" | "FURNITURE" | "VEHICLE" | "ELECTRONICS" | "OTHER",
      purchaseDate: row.date ? new Date(row.date) : new Date(),
      purchasePrice,
      currentValue,
    },
  });

  if (purchasePrice > 0) {
    await prisma.transaction.create({
      data: {
        date: row.date ? new Date(row.date) : new Date(),
        description: row.description || "Asset purchase",
        category: "INVESTMENT",
        amountOut: purchasePrice,
        source: "EXCEL_IMPORT",
      },
    });
  }

  return true;
}

async function handleRnd(row: ImportRow): Promise<boolean> {
  let project = await prisma.rndProject.findFirst({
    where: { name: "CSV Import" },
    select: { id: true },
  });
  if (!project) {
    project = await prisma.rndProject.create({
      data: { name: "CSV Import", status: "IN_PROGRESS", startDate: new Date() },
      select: { id: true },
    });
  }
  const expense = await prisma.rndExpense.create({
    data: {
      projectId: project.id,
      date: row.date ? new Date(row.date) : new Date(),
      description: row.description || "Imported expense",
      amount: row.amountOut ?? 0,
      subCategory: row.subCategory || "other",
    },
  });

  const amount = row.amountOut ?? 0;
  if (amount > 0) {
    await prisma.transaction.create({
      data: {
        date: row.date ? new Date(row.date) : new Date(),
        description: row.description || "R&D expense",
        category: "RND",
        amountOut: amount,
        source: "EXCEL_IMPORT",
        referenceId: expense.id,
      },
    });
  }

  return true;
}

async function handleMarketing(row: ImportRow): Promise<boolean> {
  const productName = row.productName?.trim();
  if (!productName || !row.recipient) return false;

  const product = await prisma.product.findFirst({
    where: { name: { equals: productName, mode: "insensitive" } },
    select: { id: true, unitCost: true },
  });
  if (!product) return false;

  const validPurposes = ["ENDORSEMENT", "SAMPLING", "EVENT", "OTHER"];
  const purpose = validPurposes.includes(row.purpose ?? "") ? row.purpose! : "OTHER";
  const qty = row.quantity ?? 1;

  const giveaway = await prisma.marketingGiveaway.create({
    data: {
      date: row.date ? new Date(row.date) : new Date(),
      recipient: row.recipient,
      purpose: purpose as "ENDORSEMENT" | "SAMPLING" | "EVENT" | "OTHER",
      items: {
        create: [{ productId: product.id, flavorId: null, quantity: qty, unitCost: product.unitCost }],
      },
    },
  });

  const invExisting = await prisma.inventory.findFirst({ where: { productId: product.id, flavorId: null } });
  if (invExisting) {
    await prisma.inventory.update({ where: { id: invExisting.id }, data: { quantity: { decrement: qty } } });
  } else {
    await prisma.inventory.create({ data: { productId: product.id, flavorId: null, quantity: -qty } });
  }
  await prisma.inventoryMovement.create({
    data: {
      productId: product.id,
      flavorId: null,
      movementType: "MARKETING_GIVEAWAY",
      quantityChange: -qty,
      referenceId: giveaway.id,
      notes: `CSV import: ${row.recipient}`,
    },
  });

  const totalCost = qty * Number(product.unitCost);
  if (totalCost > 0) {
    await prisma.transaction.create({
      data: {
        date: row.date ? new Date(row.date) : new Date(),
        description: `Giveaway – ${row.recipient} (${productName})`,
        category: "MARKETING",
        amountOut: totalCost,
        source: "EXCEL_IMPORT",
        referenceId: giveaway.id,
      },
    });
  }

  return true;
}

const SPECIAL_ROW_TYPES = new Set(["inventory", "supplies", "asset", "investment", "rnd", "r&d", "research", "marketing"]);

function makeDedupeKey(row: ImportRow): string {
  const cat = (row.category as string) || "OTHER_INCOME";
  const sub = row.subCategory || "";
  return [row.date ?? "", row.description, cat, row.amountIn ?? "", row.amountOut ?? "", sub].join("|");
}

export async function POST(req: Request) {
  const body = await req.json();
  const rows: ImportRow[] = body.rows ?? [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  // Pre-compute dedup budget for regular transaction rows.
  // For each unique signature, allowedNew = max(0, batchCount - dbCount).
  // This lets N identical rows import on first run, and skip all N on re-import,
  // without rows within the same batch blocking each other.
  const batchCounts = new Map<string, number>();
  for (const row of rows) {
    if (!row.description && !row.amountIn && !row.amountOut) continue;
    const type = (row.rowType ?? "transaction").toLowerCase();
    if (SPECIAL_ROW_TYPES.has(type)) continue;
    const k = makeDedupeKey(row);
    batchCounts.set(k, (batchCounts.get(k) ?? 0) + 1);
  }

  const dbCounts = new Map<string, number>();
  await Promise.all(
    [...batchCounts.keys()].map(async (key) => {
      const [date, description, category, amountInStr, amountOutStr, subCategory] = key.split("|");
      const count = await prisma.transaction.count({
        where: {
          date: date ? new Date(date) : undefined,
          description,
          category: category as never,
          amountIn: amountInStr !== "" ? parseFloat(amountInStr) : null,
          amountOut: amountOutStr !== "" ? parseFloat(amountOutStr) : null,
          subCategory: subCategory !== "" ? subCategory : null,
        },
      });
      dbCounts.set(key, count);
    })
  );

  const allowedNew = new Map<string, number>();
  for (const [key, bCount] of batchCounts) {
    allowedNew.set(key, Math.max(0, bCount - (dbCounts.get(key) ?? 0)));
  }

  const importedInBatch = new Map<string, number>();

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const toCreate: {
    date: Date;
    description: string;
    category: string;
    amountIn: number | null;
    amountOut: number | null;
    subCategory: string | null;
    source: string;
  }[] = [];

  let rowIndex = 0;
  for (const row of rows) {
    rowIndex++;
    try {
      if (!row.description && !row.amountIn && !row.amountOut) {
        console.log(`[SKIP] row ${rowIndex}: empty row`, { raw: row });
        skipped++;
        continue;
      }

      const type = (row.rowType ?? "transaction").toLowerCase();

      if (type === "inventory" || type === "supplies") {
        const ok = await handleInventory(row);
        if (!ok) {
          console.log(`[SKIP] row ${rowIndex} (inventory/supplies): product not found or missing productName`, { description: row.description, productName: row.productName, date: row.date });
          skipped++;
        } else {
          imported++;
        }
        continue;
      }

      if (type === "asset" || type === "investment") {
        await handleAsset(row);
        imported++;
        continue;
      }

      if (type === "rnd" || type === "r&d" || type === "research") {
        await handleRnd(row);
        imported++;
        continue;
      }

      if (type === "marketing") {
        const ok = await handleMarketing(row);
        if (!ok) {
          console.log(`[SKIP] row ${rowIndex} (marketing): product not found, missing productName, or missing recipient`, { description: row.description, productName: row.productName, recipient: row.recipient, date: row.date });
          skipped++;
        } else {
          imported++;
        }
        continue;
      }

      // Default: regular transaction — count-based dedup
      const key = makeDedupeKey(row);
      const alreadyImported = importedInBatch.get(key) ?? 0;
      const allowed = allowedNew.get(key) ?? 0;
      if (alreadyImported >= allowed) {
        console.log(`[SKIP] row ${rowIndex}: already exists in DB`, { date: row.date, description: row.description, category: row.category, amountIn: row.amountIn, amountOut: row.amountOut, subCategory: row.subCategory, dbCount: dbCounts.get(key), batchCount: batchCounts.get(key) });
        skipped++;
        continue;
      }

      toCreate.push({
        date: row.date ? new Date(row.date) : new Date(),
        description: row.description || "Imported transaction",
        category: (row.category as string) ?? "OTHER_INCOME",
        amountIn: row.amountIn ?? null,
        amountOut: row.amountOut ?? null,
        subCategory: row.subCategory || null,
        source: "EXCEL_IMPORT",
      });
      importedInBatch.set(key, alreadyImported + 1);
    } catch (err) {
      errors.push(`Row "${row.description}": ${String(err)}`);
    }
  }

  if (toCreate.length > 0) {
    await prisma.transaction.createMany({ data: toCreate as never });
  }
  imported += toCreate.length;

  return NextResponse.json({ imported, skipped, failed: errors.length, errors: errors.slice(0, 10) });
}
