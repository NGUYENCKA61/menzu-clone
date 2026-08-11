/** Reports how many products carry real skin data vs tier placeholders. */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const total = await db.product.count();
  const pending = await db.product.count({
    where: { skins: { some: { name: { startsWith: "ULTRA #" } } } },
  });
  const withWeapon = await db.productSkin.count({ where: { weapon: { not: null } } });
  console.log(`  ${total - pending}/${total} sản phẩm có dữ liệu skin thật`);
  console.log(`  ${withWeapon} skin đã tra được vũ khí`);
}

main().catch(console.error).finally(() => db.$disconnect());
