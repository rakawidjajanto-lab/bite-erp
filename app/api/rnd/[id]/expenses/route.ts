import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { date, description, amount, subCategory } = body;

  const tx = await prisma.transaction.create({
    data: {
      date: new Date(date),
      description: `R&D: ${description}`,
      category: "RND",
      amountOut: amount,
      source: "MANUAL",
    },
  });

  const expense = await prisma.rndExpense.create({
    data: {
      projectId: params.id,
      transactionId: tx.id,
      date: new Date(date),
      description,
      amount,
      subCategory,
    },
  });

  return NextResponse.json(expense, { status: 201 });
}
