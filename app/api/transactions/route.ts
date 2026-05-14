import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  const source = searchParams.get("source") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const referenceIdNull = searchParams.get("referenceIdNull") === "1";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (source) where.source = source;
  if (search) where.description = { contains: search, mode: "insensitive" };
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }
  if (referenceIdNull) where.referenceId = null;

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}

const createSchema = z.object({
  date: z.string(),
  description: z.string().min(1),
  category: z.string(),
  type: z.enum(["in", "out"]),
  amount: z.number().positive(),
  source: z.string().optional(),
  investmentDirection: z.enum(["IN", "OUT"]).optional(),
  investorName: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { date, description, category, type, amount, source, investmentDirection, investorName, notes } =
    parsed.data;

  const tx = await prisma.transaction.create({
    data: {
      date: new Date(date),
      description,
      category: category as never,
      amountIn: type === "in" ? amount : null,
      amountOut: type === "out" ? amount : null,
      source: (source as never) ?? "MANUAL",
      investmentDirection: investmentDirection as never,
      investorName,
      notes,
    },
  });

  return NextResponse.json(tx, { status: 201 });
}
