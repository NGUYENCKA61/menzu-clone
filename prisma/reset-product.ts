/**
 * Deletes one product (and its skins/tags) so `prisma/seed.ts` can recreate it
 * from scratch. Useful when the seed gains new data for an account that already
 * exists — the seed itself upserts with an empty `update`, so it will not
 * backfill relations on its own.
 *
 *   npx tsx prisma/reset-product.ts VLR2030
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const code = process.argv[2];
if (!code) {
  console.error("Usage: npx tsx prisma/reset-product.ts <CODE>");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const product = await db.product.findUnique({ where: { code } });
  if (!product) {
    console.log(`${code}: not present, nothing to reset`);
    return;
  }
  // product_skins and product_tags cascade on delete.
  await db.product.delete({ where: { code } });
  console.log(`${code}: deleted`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
