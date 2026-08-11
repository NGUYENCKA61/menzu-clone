import "dotenv/config";

import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 moved the datasource URL out of schema.prisma. Migrations read it
 * from here; the runtime client gets a driver adapter instead (see src/lib/db.ts).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
