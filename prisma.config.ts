import "dotenv/config";

import { defineConfig } from "prisma/config";

/**
 * Prisma 7 moved the datasource URL out of schema.prisma. Migrations read it
 * from here; the runtime client gets a driver adapter instead (see src/lib/db.ts).
 *
 * The URL falls back to a placeholder because `prisma generate` runs during
 * `npm install` on machines that have no DATABASE_URL (CI build stages) —
 * generate never opens a connection, and migrate/seed only run where the
 * real variable exists.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
