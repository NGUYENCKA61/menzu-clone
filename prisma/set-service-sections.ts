/**
 * Backfills Service.isGameService for rows seeded before the column existed.
 *
 * The live /services page splits "Dịch Vụ Game" from "Dịch Vụ Khác"; these
 * three slugs are the game side.
 *
 *   npx tsx prisma/set-service-sections.ts
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const GAME_SLUGS = ["riotgames", "valorantpoint-vn", "valorantpoint-ph"];

async function main() {
  const game = await db.service.updateMany({
    where: { slug: { in: GAME_SLUGS } },
    data: { isGameService: true },
  });
  const other = await db.service.updateMany({
    where: { slug: { notIn: GAME_SLUGS } },
    data: { isGameService: false },
  });
  console.log(`Dịch Vụ Game: ${game.count}, Dịch Vụ Khác: ${other.count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
