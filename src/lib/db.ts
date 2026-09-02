import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma 7 takes a driver adapter instead of reading `url` from the schema.
 * The client is cached on globalThis so Next.js dev hot-reloads don't open a
 * new pool on every recompile.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill in your Postgres password.",
    );
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}

/**
 * Opened on first use, not at import. `next build` loads every route module
 * to read its config, and the Docker image is built on a machine with no
 * DATABASE_URL at all — the Postgres container is a sibling that only exists
 * once the stack is up. Creating the client at import time made the build
 * throw before it had rendered anything. Nothing queries during the build
 * (every route is dynamic, see app/layout.tsx), so the first touch is the
 * first real request, where the missing-variable error above still fires.
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property, client) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/** BigInt columns (VND amounts) don't survive JSON.stringify — convert at the edge. */
export function toNumber(value: bigint): number {
  return Number(value);
}
