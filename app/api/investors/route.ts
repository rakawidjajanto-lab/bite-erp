import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function detectInvestor(description: string, investorName: string | null): string {
  if (investorName?.trim()) return investorName.trim();
  const lower = description.toLowerCase();
  if (lower.includes("nabilla") || lower.includes("billa")) return "Billa";
  if (lower.includes("raka")) return "Raka";
  return "Unknown";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = { category: "INVESTMENT", amountIn: { gt: 0 } };
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      description: true,
      amountIn: true,
      amountOut: true,
      investorName: true,
      notes: true,
    },
  });

  const result = transactions.map((tx) => ({
    ...tx,
    resolvedName: detectInvestor(tx.description, tx.investorName),
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const { investorName, amount, description, date } = await req.json() as {
    investorName: string;
    amount: number;
    description: string;
    date: string;
  };

  if (!investorName || !amount || !description || !date) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const tx = await prisma.transaction.create({
    data: {
      date: new Date(date),
      description,
      category: "INVESTMENT",
      amountIn: amount,
      investorName,
      source: "MANUAL",
    },
    select: {
      id: true,
      date: true,
      description: true,
      amountIn: true,
      amountOut: true,
      investorName: true,
      notes: true,
    },
  });

  return NextResponse.json(
    { ...tx, resolvedName: detectInvestor(description, investorName) },
    { status: 201 }
  );
}
