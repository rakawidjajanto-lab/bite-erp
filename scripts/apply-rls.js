const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  const sql = fs.readFileSync(
    path.join(__dirname, "../supabase/reset-rls.sql"),
    "utf-8"
  );
  // Split on semicolons, trim whitespace, discard blank entries and comment-only lines
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const stmt of statements) {
    await prisma.$executeRawUnsafe(stmt);
  }
  console.log(`✓ RLS: applied ${statements.length} statements`);
}

main()
  .catch((e) => {
    console.error("RLS apply failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
