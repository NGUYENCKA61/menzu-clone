/** Confirms the catalogue is untouched after a verification run. */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const [total, available, sold, users, orders] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { status: "AVAILABLE" } }),
    db.product.count({ where: { status: "SOLD" } }),
    db.user.count(),
    db.order.count(),
  ]);
  console.log(`  sản phẩm: ${total} (còn bán ${available}, đã bán ${sold})`);
  console.log(`  người dùng: ${users}, đơn hàng: ${orders}`);
  const leftover = await db.user.count({ where: { username: { startsWith: "e2e_" } } });
  console.log(`  tài khoản test còn sót: ${leftover}`);
}

main().catch(console.error).finally(() => db.$disconnect());
