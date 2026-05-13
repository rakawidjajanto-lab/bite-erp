import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type InventoryItem = { productId: string; flavorId?: string; quantity: number };

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { date, description, amount, subCategory, inventoryItems } = body as {
    date: string;
    description: string;
    amount: number;
    subCategory: string;
    inventoryItems?: InventoryItem[];
  };

  const expense = await prisma.rndExpense.create({
    data: {
      projectId: params.id,
      date: new Date(date),
      description,
      amount,
      subCategory,
    },
  });

  if (inventoryItems && inventoryItems.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: inventoryItems.map((i) => i.productId) } },
      select: { id: true, unitCost: true },
    });
    const costMap = Object.fromEntries(products.map((p) => [p.id, p.unitCost]));

    await Promise.all(
      inventoryItems.map(async (item) => {
        const unitCost = costMap[item.productId] ?? 0;
        await prisma.rndInventoryUsage.create({
          data: {
            expenseId: expense.id,
            productId: item.productId,
            flavorId: item.flavorId ?? null,
            quantity: item.quantity,
            unitCost,
          },
        });
        await prisma.inventory.upsert({
          where: { productId_flavorId: { productId: item.productId, flavorId: item.flavorId ?? null } },
          update: { quantity: { decrement: item.quantity } },
          create: { productId: item.productId, flavorId: item.flavorId ?? null, quantity: -item.quantity },
        });
        await prisma.inventoryMovement.create({
          data: {
            productId: item.productId,
            flavorId: item.flavorId ?? null,
            movementType: "RND_USAGE",
            quantityChange: -item.quantity,
            referenceId: expense.id,
            notes: `R&D: ${description}`,
          },
        });
      })
    );
  }

  return NextResponse.json(expense, { status: 201 });
}
