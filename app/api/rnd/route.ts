import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const expenseWhere: Record<string, unknown> = {};
  if (from || to) {
    expenseWhere.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }

  const projects = await prisma.rndProject.findMany({
    where:
      from || to
        ? { expenses: { some: expenseWhere } }
        : undefined,
    include: {
      targetFlavor: { select: { name: true } },
      expenses: {
        where: expenseWhere,
        include: {
          inventoryUsages: {
            include: {
              product: { select: { name: true } },
              flavor: { select: { name: true, colorHex: true } },
            },
          },
        },
        orderBy: { date: "desc" },
      },
      materials: {
        include: {
          supplyItem: { select: { id: true, name: true, unit: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    projects.map((p) => ({
      ...p,
      totalExpenses: p.expenses.reduce((s, e) => s + parseFloat(String(e.amount)), 0),
      totalMaterialCost: p.materials.reduce((s, m) => s + parseFloat(String(m.valuationCost)), 0),
    }))
  );
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, description, startDate, targetFlavorId, materials } = body as {
    name: string;
    description?: string;
    startDate: string;
    targetFlavorId?: string;
    materials?: { supplyItemId: string; quantityUsed: number }[];
  };

  const project = await prisma.rndProject.create({
    data: { name, description, startDate: new Date(startDate), targetFlavorId },
  });

  if (materials?.length) {
    for (const mat of materials) {
      if (!mat.supplyItemId || mat.quantityUsed <= 0) continue;
      const item = await prisma.supplyItem.findUnique({ where: { id: mat.supplyItemId } });
      if (!item) continue;
      const valuationCost = Number(mat.quantityUsed) * Number(item.pricePerUnit);
      await prisma.rndMaterial.create({
        data: { projectId: project.id, supplyItemId: mat.supplyItemId, quantityUsed: mat.quantityUsed, valuationCost },
      });
      await prisma.supplyItem.update({
        where: { id: mat.supplyItemId },
        data: { stock: { decrement: Number(mat.quantityUsed) } },
      });
    }
  }

  return NextResponse.json(project, { status: 201 });
}
