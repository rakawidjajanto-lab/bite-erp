import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RndRow = {
  projectName?: string;
  date: string;
  description: string;
  subCategory: string;
  amount: number;
};

async function resolveProjectId(projectId: string | undefined, projectName: string | undefined): Promise<string | null> {
  if (projectId) return projectId;

  const name = projectName?.trim();
  if (!name) return null;

  let project = await prisma.rndProject.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });

  if (!project) {
    project = await prisma.rndProject.create({
      data: { name, startDate: new Date(), status: "IN_PROGRESS" },
    });
  }

  return project.id;
}

export async function POST(req: Request) {
  const body = (await req.json()) as { projectId?: string; rows: RndRow[] };
  const { rows } = body;

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.description || !row.amount) { skipped++; continue; }

    const projectId = await resolveProjectId(body.projectId, row.projectName).catch(() => null);
    if (!projectId) { failed++; continue; }

    try {
      const expense = await prisma.rndExpense.create({
        data: {
          projectId,
          date: new Date(row.date),
          description: row.description,
          amount: row.amount,
          subCategory: row.subCategory || "other",
        },
      });

      if (row.amount > 0) {
        await prisma.transaction.create({
          data: {
            date: new Date(row.date),
            description: row.description,
            category: "RND",
            amountOut: row.amount,
            source: "EXCEL_IMPORT",
            referenceId: expense.id,
          },
        });
      }

      imported++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ imported, skipped, failed });
}
