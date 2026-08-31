/**
 * Fills in the four inventory totals that the original scrape missed.
 *
 * The account detail page shows five tabs — Skins, Buddies, Agents, Cards,
 * Sprays — but only weapon skins came across with per-item data. The other
 * four rendered 0 because nothing populated them.
 *
 *   node scripts/scrape-inventory.mjs [limit]
 *
 * Each product page is loaded in the Chrome that scripts/capture-page.mjs
 * leaves running, the tab counts are read off the rendered DOM, and the totals
 * are written to Product. Products already carrying counts are skipped, so
 * this is safe to re-run and safe to interrupt.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const TABS = [
  ["Buddies", "buddyCount"],
  ["Agents", "agentCount"],
  ["Cards", "cardCount"],
  ["Sprays", "sprayCount"],
];

/**
 * Reads a tab's badge count.
 *
 * The label and its number are separated by a span, so the pattern skips one
 * tag rather than expecting them adjacent.
 */
function countFor(html, label) {
  const match = html.match(new RegExp(`${label}\\s*<[^>]*>\\s*([0-9]+)`));
  return match ? Number(match[1]) : null;
}

async function main() {
  const limit = Number(process.argv[2]) || 0;

  const products = await db.product.findMany({
    where: { buddyCount: null },
    select: { code: true },
    orderBy: { code: "asc" },
    ...(limit ? { take: limit } : {}),
  });

  if (products.length === 0) {
    console.log("Every product already has inventory counts.");
    return;
  }

  console.log(`${products.length} product(s) to scrape`);
  const workDir = await mkdtemp(join(tmpdir(), "menzu-inv-"));
  let updated = 0;
  const failures = [];

  for (const { code } of products) {
    const file = join(workDir, `${code}.html`);
    const result = spawnSync(
      process.execPath,
      ["scripts/capture-page.mjs", `https://menzu.lol/account/${code}`, file],
      { encoding: "utf8", timeout: 120_000 },
    );

    if (result.status !== 0) {
      failures.push(`${code}: capture failed`);
      continue;
    }

    let html;
    try {
      html = await import("node:fs/promises").then((fs) => fs.readFile(file, "utf8"));
    } catch {
      failures.push(`${code}: unreadable capture`);
      continue;
    }

    const data = {};
    for (const [label, column] of TABS) {
      const value = countFor(html, label);
      if (value !== null) data[column] = value;
    }

    if (Object.keys(data).length !== TABS.length) {
      // A partial read means the page did not finish rendering; leaving the
      // row null keeps it in the queue for the next run rather than baking in
      // a wrong total.
      failures.push(`${code}: only read ${Object.keys(data).length}/4 tabs`);
      continue;
    }

    await db.product.update({ where: { code }, data });
    updated += 1;
    console.log(
      `  ${code}  buddies=${data.buddyCount} agents=${data.agentCount} ` +
        `cards=${data.cardCount} sprays=${data.sprayCount}`,
    );
  }

  await rm(workDir, { recursive: true, force: true });
  console.log(`\n${updated} updated, ${failures.length} failed`);
  for (const failure of failures) console.log(`  ${failure}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
