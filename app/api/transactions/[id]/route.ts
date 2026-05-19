import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { description } = await req.json();
  if (!description?.trim()) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }
  const tx = await prisma.transaction.update({
    where: { id },
    data: { description: description.trim() },
    select: { id: true, description: true },
  });
  return NextResponse.json(tx);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
