const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

// Split SQL on semicolons, but not semicolons inside $$ dollar-quote blocks
function splitStatements(sql) {
  const statements = [];
  let current = "";
  let inDollarQuote = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "$" && sql[i + 1] === "$") {
      inDollarQuote = !inDollarQuote;
      current += "$$";
      i++;
      continue;
    }
    if (ch === ";" && !inDollarQuote) {
      const stmt = current.trim();
      if (stmt && !stmt.startsWith("--")) statements.push(stmt);
      current = "";
    } else {
      current += ch;
    }
  }
  const last = current.trim();
  if (last && !last.startsWith("--")) statements.push(last);
  return statements;
}

async function main() {
  const sql = fs.readFileSync(
    path.join(__dirname, "../supabase/reset-rls.sql"),
    "utf-8"
  );
  const statements = splitStatements(sql);
  for (const stmt of statements) {
    await prisma.$executeRawUnsafe(stmt);
  }
  console.log(`✓ DB config: applied ${statements.length} statements`);
}

main()
  .catch((e) => {
    console.error("DB config failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
