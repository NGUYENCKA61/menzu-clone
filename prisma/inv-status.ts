/** Reports how many products carry scraped inventory totals. */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const total = await db.product.count();
  const done = await db.product.count({ where: { buddyCount: { not: null } } });
  const missing = await db.product.findMany({
    where: { buddyCount: null },
    select: { code: true },
    orderBy: { code: "asc" },
  });
  console.log(`  ${done}/${total} sản phẩm có số kho đồ`);
  if (missing.length) console.log(`  còn thiếu: ${missing.map((m) => m.code).join(", ")}`);
}

main().catch(console.error).finally(() => db.$disconnect());
