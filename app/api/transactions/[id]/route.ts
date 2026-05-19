import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { description, category } = await req.json();

  const data: Record<string, unknown> = {};
  if (description !== undefined) {
    if (!description?.trim()) {
      return NextResponse.json({ error: "description cannot be empty" }, { status: 400 });
    }
    data.description = description.trim();
  }
  if (category !== undefined) data.category = category;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const tx = await prisma.transaction.update({
    where: { id },
    data,
    select: { id: true, description: true, category: true },
  });
  return NextResponse.json(tx);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
