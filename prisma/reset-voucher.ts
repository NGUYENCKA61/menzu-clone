/**
 * Removes a voucher. Safe only while nothing references it — the app itself
 * toggles vouchers inactive rather than deleting them, because orders keep a
 * foreign key to the voucher they used.
 *
 *   npx tsx prisma/reset-voucher.ts <CODE>
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const code = process.argv[2];
if (!code) {
  console.error("Usage: npx tsx prisma/reset-voucher.ts <CODE>");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const voucher = await db.voucher.findUnique({
    where: { code },
    include: { _count: { select: { orders: true } } },
  });
  if (!voucher) {
    console.log(`${code}: not present`);
    return;
  }
  if (voucher._count.orders > 0) {
    console.error(
      `${code}: still referenced by ${voucher._count.orders} order(s); deactivate instead`,
    );
    process.exitCode = 1;
    return;
  }
  await db.voucher.delete({ where: { code } });
  console.log(`${code}: deleted`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
