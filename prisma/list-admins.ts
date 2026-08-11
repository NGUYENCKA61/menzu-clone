/**
 * Lists which accounts hold the ADMIN role.
 *
 * Read-only, and prints no credentials — passwords are scrypt hashes and
 * cannot be read back out. Use prisma/make-admin.ts to grant the role.
 *
 *   npx tsx prisma/list-admins.ts
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const users = await db.user.findMany({
    select: { username: true, email: true, role: true },
    orderBy: { createdAt: "asc" },
  });

  const admins = users.filter((user) => user.role === "ADMIN");

  console.log(`Tổng số tài khoản: ${users.length}`);
  console.log(`Admin: ${admins.length}`);
  for (const admin of admins) {
    console.log(`  - ${admin.username}${admin.email ? ` <${admin.email}>` : ""}`);
  }

  if (users.length > 0 && admins.length === 0) {
    console.log("Tài khoản thường (chưa có admin nào):");
    for (const user of users.slice(0, 8)) console.log(`  - ${user.username}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
