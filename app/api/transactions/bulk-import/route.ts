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

export async function POST(req: Request) {
  const body = await req.json();
  const rows: ImportRow[] = body.rows ?? [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      if (!row.description && !row.amountIn && !row.amountOut) { skipped++; continue; }

      const type = (row.rowType ?? "transaction").toLowerCase();

      if (type === "inventory" || type === "supplies") {
        const ok = await handleInventory(row);
        ok ? imported++ : skipped++;
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
        ok ? imported++ : skipped++;
        continue;
      }

      // Default: regular transaction with duplicate check
      const category = (row.category as never) ?? "OTHER_INCOME";
      const existing = await prisma.transaction.findFirst({
        where: {
          date: row.date ? new Date(row.date) : undefined,
          description: row.description,
          category,
          amountIn: row.amountIn,
          amountOut: row.amountOut,
        },
      });
      if (existing) { skipped++; continue; }

      await prisma.transaction.create({
        data: {
          date: row.date ? new Date(row.date) : new Date(),
          description: row.description || "Imported transaction",
          category,
          amountIn: row.amountIn ?? null,
          amountOut: row.amountOut ?? null,
          source: "EXCEL_IMPORT",
        },
      });
      imported++;
    } catch (err) {
      errors.push(`Row "${row.description}": ${String(err)}`);
    }
  }

  return NextResponse.json({ imported, skipped, failed: errors.length, errors: errors.slice(0, 10) });
}
