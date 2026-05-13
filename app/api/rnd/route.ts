import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const projects = await prisma.rndProject.findMany({
    include: {
      targetFlavor: { select: { name: true } },
      expenses: {
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
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    projects.map((p) => ({
      ...p,
      totalExpenses: p.expenses.reduce((s, e) => s + parseFloat(String(e.amount)), 0),
    }))
  );
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, description, startDate, targetFlavorId } = body;
  const project = await prisma.rndProject.create({
    data: { name, description, startDate: new Date(startDate), targetFlavorId },
  });
  return NextResponse.json(project, { status: 201 });
}
