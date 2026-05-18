import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { description } = await req.json();
  if (!description?.trim()) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }
  const tx = await prisma.transaction.update({
    where: { id: params.id },
    data: { description: description.trim() },
    select: { id: true, description: true },
  });
  return NextResponse.json(tx);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.transaction.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
