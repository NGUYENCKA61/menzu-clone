/**
 * One-off migration for the WebP re-encode: rewrites every stored image path
 * from .png/.jpg to .webp.
 *
 * Seeded rows carry the original extensions, and re-running the seed would
 * destroy real user data (accounts, orders, ledger), so the paths are patched
 * in place instead.
 *
 *   npx tsx prisma/webp-paths.ts
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const COLUMNS: [table: string, column: string][] = [
  ["products", "imageUrl"],
  ["categories", "imageUrl"],
  ["services", "imageUrl"],
  ["feedback", "avatarUrl"],
];

async function main() {
  for (const [table, column] of COLUMNS) {
    try {
      const updated = await db.$executeRawUnsafe(
        `UPDATE "${table}" SET "${column}" = regexp_replace("${column}", '\\.(png|jpe?g)$', '.webp')
         WHERE "${column}" ~ '\\.(png|jpe?g)$'`,
      );
      console.log(`${table}.${column}: ${updated} rows`);
    } catch (error) {
      const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
      console.log(`${table}.${column}: skipped (${message.slice(0, 70)})`);
    }
  }

  const sample = await db.product.findFirst({ select: { imageUrl: true } });
  console.log(`sample: ${sample?.imageUrl}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
