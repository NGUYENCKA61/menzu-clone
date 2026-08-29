/**
 * Turns the migration's safe placeholder slugs into the real ones.
 *
 * 20260825080000_product_slug fills every row with an ASCII-mangled name plus
 * an id suffix, because Postgres cannot fold Vietnamese marks without an
 * extension. This does it in the application's own slugify — the same function
 * the admin desk uses — so "Hack PUBG Bản DESYNC" becomes hack-pubg-ban-desync
 * rather than hack-pubg-b-n-desync-a1b2c3.
 *
 * Only touches rows still wearing a placeholder: a slug the shop has since
 * edited is a published address and is left exactly as it is.
 *
 *   node scripts/backfill-product-slugs.mjs          # report only
 *   node scripts/backfill-product-slugs.mjs --write  # apply
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

function slugify(input) {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The shape the migration wrote: …-<last 6 of a cuid>. */
function looksGenerated(slug, id) {
  return slug.endsWith(`-${id.slice(-6)}`);
}

const write = process.argv.includes("--write");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const products = await db.product.findMany({
  select: { id: true, code: true, name: true, rank: true, productType: true, slug: true },
  orderBy: { createdAt: "asc" },
});

// Slugs already settled by hand keep their claim on the name.
const taken = new Set(
  products.filter((p) => !looksGenerated(p.slug, p.id)).map((p) => p.slug),
);

const changes = [];
for (const product of products) {
  if (!looksGenerated(product.slug, product.id)) continue;

  // Accounts carry no name — their address says rank and code instead, the
  // same shape the admin desk mints for new ones: "acc-gold-1-vlr9999".
  const source =
    product.name ??
    (product.productType === "ACCOUNT_GAME"
      ? `Acc ${product.rank || ""} ${product.code}`
      : "");
  const base = slugify(source) || slugify(product.code) || "san-pham";
  let candidate = base;
  for (let n = 2; taken.has(candidate); n += 1) candidate = `${base}-${n}`;
  taken.add(candidate);

  if (candidate !== product.slug) {
    changes.push({ id: product.id, code: product.code, from: product.slug, to: candidate });
  }
}

for (const change of changes) {
  console.log(`${change.code.padEnd(16)} ${change.from}  ->  ${change.to}`);
}

if (!changes.length) {
  console.log("Không có slug nào cần đổi.");
} else if (write) {
  for (const change of changes) {
    await db.product.update({ where: { id: change.id }, data: { slug: change.to } });
  }
  console.log(`\nĐã cập nhật ${changes.length} slug.`);
} else {
  console.log(`\n${changes.length} slug sẽ đổi. Chạy lại với --write để áp dụng.`);
}

await db.$disconnect();
