/**
 * Promotes an existing account to ADMIN.
 *
 * Admin is granted from the server side only — there is deliberately no
 * self-service path in the app, so the first admin has to be made here.
 *
 *   npx tsx prisma/make-admin.ts <username>
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const username = process.argv[2];
if (!username) {
  console.error("Usage: npx tsx prisma/make-admin.ts <username>");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const user = await db.user.findUnique({ where: { username } });
  if (!user) {
    console.error(`${username}: not found`);
    process.exitCode = 1;
    return;
  }
  await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  console.log(`${username}: now ADMIN (uid ${user.uid})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
