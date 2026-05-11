import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const venues = await prisma.padelVenue.findMany({ where: { isActive: true } });
  return NextResponse.json(venues);
}

export async function POST(req: Request) {
  const body = await req.json();
  const venue = await prisma.padelVenue.create({ data: body });
  return NextResponse.json(venue, { status: 201 });
}
