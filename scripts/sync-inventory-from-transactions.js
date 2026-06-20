const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const txs = await prisma.transaction.findMany({
    where: { category: "SUPPLIES", inventoryLinks: { none: {} } },
    select: { id: true, description: true, amountOut: true },
  });

  console.log(`Found ${txs.length} unlinked SUPPLIES transactions`);

  for (const tx of txs) {
    const name = tx.description.trim();
    const match = await prisma.supplyItem.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (!match) {
      await prisma.supplyItem.create({
        data: {
          name,
          unit: "unit",
          gramsPerUnit: 1,
          stockVenue: 0,
          stockEcommerce: 0,
          pricePerUnit: 0,
        },
      });
      console.log(`Created stub: ${name}`);
    } else {
      console.log(`Skipped (exists): ${name}`);
    }
  }

  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
