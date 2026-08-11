/**
 * Replaces the placeholder inventory with the real one.
 *
 * The original scrape stored one ProductSkin row per weapon skin carrying only
 * its tier, so names read "EXCLUSIVE #2" and the weapon-filter row above the
 * grid could not be built at all. The account pages actually embed the whole
 * inventory as JSON — item uuid, display name and icon for skins, buddies,
 * agents, sprays and cards — so none of that had to be guessed.
 *
 *   node scripts/scrape-skins.mjs [limit]
 *
 * Weapon assignment comes from valorant-api.com's own weapon list, not from
 * the skin name: melee skins carry no weapon word ("Equilibrium", "Heart
 * Splitter"), so name-matching would drop every knife on the page.
 *
 * Products whose skins already have real names are skipped, so this is safe to
 * re-run and safe to interrupt.
 */
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Embedded array name -> the SkinKind it maps to. */
const KINDS = [
  ["skins", "WEAPON_SKIN"],
  ["buddies", "BUDDY"],
  ["agents", "AGENT"],
  ["sprays", "SPRAY"],
  ["cards", "CARD"],
];

async function weaponBySkinUuid() {
  const response = await fetch("https://valorant-api.com/v1/weapons", {
    signal: AbortSignal.timeout(60_000),
  });
  const { data } = await response.json();

  const map = new Map();
  for (const weapon of data) {
    // Riot files knives under "Melee"; the live filter row labels it the same.
    for (const skin of weapon.skins ?? []) map.set(skin.uuid, weapon.displayName);
  }
  return map;
}

/**
 * Pulls one embedded array out of the flight data.
 *
 * The payload is escaped JSON inside a script tag, so it is unescaped first
 * and then bracket-matched — a regex cannot find the closing bracket of an
 * array whose objects contain nested arrays.
 */
function extractArray(html, key) {
  const text = html.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  const start = text.indexOf(`"${key}":[`);
  if (start === -1) return [];

  let depth = 0;
  const from = text.indexOf("[", start);
  for (let i = from; i < text.length; i += 1) {
    if (text[i] === "[") depth += 1;
    else if (text[i] === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(from, i + 1));
        } catch {
          return [];
        }
      }
    }
  }
  return [];
}

/** An item's display name lives either on the item or on its first level. */
function nameOf(item) {
  return item.displayName ?? item.levels?.[0]?.displayName ?? null;
}

function iconOf(item) {
  return item.displayIcon ?? item.levels?.[0]?.displayIcon ?? item.chromas?.[0]?.displayIcon ?? null;
}

async function main() {
  const limit = Number(process.argv[2]) || 0;
  const weapons = await weaponBySkinUuid();
  console.log(`weapon lookup: ${weapons.size} skins`);

  // A product still holding placeholder names has not been done yet.
  const pending = await db.product.findMany({
    where: { skins: { some: { name: { startsWith: "ULTRA #" } } } },
    select: { id: true, code: true },
    orderBy: { code: "asc" },
    ...(limit ? { take: limit } : {}),
  });

  if (pending.length === 0) {
    console.log("Every product already has real skin data.");
    return;
  }

  console.log(`${pending.length} product(s) to scrape`);
  const workDir = await mkdtemp(join(tmpdir(), "menzu-skins-"));
  let done = 0;
  const failures = [];

  for (const product of pending) {
    const file = join(workDir, `${product.code}.html`);
    const result = spawnSync(
      process.execPath,
      ["scripts/capture-page.mjs", `https://menzu.lol/account/${product.code}`, file],
      { encoding: "utf8", timeout: 150_000 },
    );
    if (result.status !== 0) {
      failures.push(`${product.code}: capture failed`);
      continue;
    }

    const html = await readFile(file, "utf8").catch(() => null);
    if (!html) {
      failures.push(`${product.code}: unreadable capture`);
      continue;
    }

    const rows = [];
    for (const [key, kind] of KINDS) {
      for (const item of extractArray(html, key)) {
        const name = nameOf(item);
        if (!name) continue;
        rows.push({
          productId: product.id,
          kind,
          name,
          iconUrl: iconOf(item),
          weapon: kind === "WEAPON_SKIN" ? (weapons.get(item.uuid) ?? null) : null,
        });
      }
    }

    if (rows.length === 0) {
      // Sold accounts 404 upstream. Leaving the placeholders alone keeps the
      // product in the queue rather than emptying its inventory.
      failures.push(`${product.code}: no inventory found (sold upstream?)`);
      continue;
    }

    await db.$transaction([
      db.productSkin.deleteMany({ where: { productId: product.id } }),
      db.productSkin.createMany({ data: rows }),
    ]);

    const named = rows.filter((r) => r.kind === "WEAPON_SKIN");
    const withWeapon = named.filter((r) => r.weapon).length;
    done += 1;
    console.log(
      `  ${product.code}  ${rows.length} items, ${named.length} skins ` +
        `(${withWeapon} matched to a weapon)`,
    );
  }

  await rm(workDir, { recursive: true, force: true });
  console.log(`\n${done} updated, ${failures.length} failed`);
  for (const failure of failures) console.log(`  ${failure}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
