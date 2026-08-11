/**
 * Clears data produced by manually exercising the purchase flow: removes a
 * user together with their sessions, orders and ledger rows, and returns any
 * product they bought to AVAILABLE.
 *
 *   npx tsx prisma/reset-demo.ts testbuyer
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const username = process.argv[2];
if (!username) {
  console.error("Usage: npx tsx prisma/reset-demo.ts <username>");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const user = await db.user.findUnique({
    where: { username },
    include: { orders: { select: { productId: true } } },
  });
  if (!user) {
    console.log(`${username}: not present`);
    return;
  }

  const productIds = user.orders.map((o) => o.productId);
  if (productIds.length > 0) {
    await db.product.updateMany({
      where: { id: { in: productIds } },
      data: { status: "AVAILABLE", soldCount: 0 },
    });
  }

  await db.transaction.deleteMany({ where: { userId: user.id } });
  await db.order.deleteMany({ where: { userId: user.id } });
  await db.topUp.deleteMany({ where: { userId: user.id } });
  await db.serviceOrder.deleteMany({ where: { userId: user.id } });
  await db.session.deleteMany({ where: { userId: user.id } });
  await db.user.delete({ where: { id: user.id } });

  console.log(
    `${username}: removed; ${productIds.length} product(s) returned to AVAILABLE`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
