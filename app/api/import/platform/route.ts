import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parsePlatformExcel } from "@/lib/import/platform-excel-parser";

type ProductWithFlavors = {
  id: string;
  name: string;
  flavors: { id: string; name: string }[];
};

export async function POST(req: Request) {
  let platformName = "";
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const { platform, orders } = parsePlatformExcel(buffer);
    platformName = platform === "tokopedia" ? "Tokopedia" : "Shopee";
    const txSource = platform === "tokopedia" ? "TOKOPEDIA" : "SHOPEE";

    let platformRecord = await prisma.platform.findUnique({ where: { name: platformName } });
    if (!platformRecord) {
      platformRecord = await prisma.platform.create({ data: { name: platformName } });
    }

    // Fetch all products with their flavors once — used for matching across all order items.
    const allProducts: ProductWithFlavors[] = await prisma.product.findMany({
      include: { flavors: { select: { id: true, name: true } } },
    });

    for (const order of orders) {
      try {
        const existing = await prisma.platformOrder.findUnique({
          where: {
            platformId_externalOrderId: {
              platformId: platformRecord.id,
              externalOrderId: order.externalOrderId,
            },
          },
        });

        if (existing) {
          if (existing.status === "PENDING" && order.settlementStatus === "SETTLED") {
            const tx = await prisma.transaction.create({
              data: {
                date: new Date(order.orderDate),
                description: order.description ?? `${platformName} order #${order.externalOrderId}`,
                category: "SALES",
                amountIn: order.netAmount,
                source: txSource as never,
              },
            });

            await prisma.platformOrder.update({
              where: { id: existing.id },
              data: {
                status: "DELIVERED",
                transactionId: tx.id,
                settlementDate: order.settlementDate ? new Date(order.settlementDate) : null,
              },
            });

            await createPlatformFeeTx(order, txSource);
            await prisma.platformOrderItem.deleteMany({ where: { orderId: existing.id } });
            await createOrderItems(existing.id, order.items, allProducts);
            updated++;
          } else {
            skipped++;
          }
          continue;
        }

        let transactionId: string | undefined;
        if (order.settlementStatus === "SETTLED") {
          const tx = await prisma.transaction.create({
            data: {
              date: new Date(order.orderDate),
              description: order.description ?? `${platformName} order #${order.externalOrderId}`,
              category: "SALES",
              amountIn: order.netAmount,
              source: txSource as never,
            },
          });
          transactionId = tx.id;
          await createPlatformFeeTx(order, txSource);
        }

        const created = await prisma.platformOrder.create({
          data: {
            platformId: platformRecord.id,
            externalOrderId: order.externalOrderId,
            orderDate: new Date(order.orderDate),
            status: order.settlementStatus === "SETTLED" ? "DELIVERED" : "PENDING",
            grossAmount: order.grossAmount,
            platformFee: order.platformFee,
            shippingCost: 0,
            discount: 0,
            netAmount: order.netAmount,
            customerName: order.customerName,
            settlementDate: order.settlementDate ? new Date(order.settlementDate) : null,
            transactionId,
            rawData: order.rawData as object,
          },
        });

        await createOrderItems(created.id, order.items, allProducts);
        imported++;
      } catch (err) {
        errors.push(`${order.externalOrderId}: ${String(err)}`);
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: String(err), imported, updated, skipped, failed: errors.length },
      { status: 400 }
    );
  }

  return NextResponse.json({
    platform: platformName,
    imported,
    updated,
    skipped,
    failed: errors.length,
    errors: errors.slice(0, 5),
  });
}

async function createPlatformFeeTx(
  order: { feeReferenceId?: string; feeDescription?: string; platformFee: number; settlementDate: string | null; orderDate: string; description?: string; externalOrderId: string },
  txSource: string
) {
  if (!order.feeReferenceId || order.platformFee <= 0) return;

  const existing = await prisma.transaction.findFirst({
    where: { referenceId: order.feeReferenceId },
    select: { id: true },
  });
  if (existing) return;

  const feeLabel = order.feeDescription ?? order.description?.replace("Income Settlement", "Platform Fee") ?? `Platform Fee ${order.externalOrderId}`;
  const feeDate = new Date(order.orderDate);

  await prisma.transaction.create({
    data: {
      date: feeDate,
      description: feeLabel,
      category: "OPERATIONAL",
      amountOut: order.platformFee,
      source: txSource as never,
      referenceId: order.feeReferenceId,
    },
  });
}

async function createOrderItems(
  orderId: string,
  items: { productName: string; quantity: number; unitPrice: number }[],
  allProducts: ProductWithFlavors[]
) {
  for (const item of items) {
    if (!item.productName) continue;

    let productId: string | null = null;
    let flavorId: string | null = null;

    // The Excel item name is long (e.g. "Premium Grade Matcha - 23g Protein Gelato (Cup 150ml)").
    // Find the product whose name appears as a substring inside the item name.
    const product = allProducts.find((p) =>
      item.productName.toLowerCase().includes(p.name.toLowerCase())
    );

    if (product) {
      productId = product.id;
      const matchedFlavor = product.flavors.find((f) =>
        item.productName.toLowerCase().includes(f.name.toLowerCase())
      );
      if (matchedFlavor) flavorId = matchedFlavor.id;
    }

    const subtotal = item.unitPrice * item.quantity;
    await prisma.platformOrderItem.create({
      data: {
        orderId,
        productId,
        flavorId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal,
      },
    });
  }
}
