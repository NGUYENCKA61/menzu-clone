import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
async function main() {
  const empty = await db.docArticle.findMany({ where: { body: null }, select: { title: true } });
  console.log(`  ${empty.length} bài trống: ${empty.map((e) => e.title).join(", ") || "(không)"}`);
}
main().catch(console.error).finally(() => db.$disconnect());
