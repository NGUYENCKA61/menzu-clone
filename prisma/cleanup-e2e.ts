/** Removes throwaway accounts left by the verification scripts. */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const users = await db.user.findMany({ where: { username: { startsWith: "e2e_" } } });
  for (const user of users) {
    await db.tradeRequest.deleteMany({ where: { userId: user.id } });
    await db.transaction.deleteMany({ where: { userId: user.id } });
    await db.order.deleteMany({ where: { userId: user.id } });
    await db.session.deleteMany({ where: { userId: user.id } });
    await db.authAttempt.deleteMany({ where: { identifier: user.username.toLowerCase() } });
    await db.user.delete({ where: { id: user.id } });
  }
  console.log(`  xoá ${users.length} tài khoản test, còn ${await db.user.count()} người dùng`);
}

main().catch(console.error).finally(() => db.$disconnect());
