// Seeds the wiki articles kept in content/wiki into the database.
//
//   node --env-file=.env scripts/seed-wiki.mjs [--dry]
//
// content/wiki/articles.json lists each article's slug, shelf, title, excerpt,
// featured flag, sort order and the old slugs it replaces; the body is the
// .html file of the same slug; the cover is public/images/docs/covers/<slug>.webp
// (made by scripts/make-doc-covers.mjs), falling back to the stock doc image.
//
// Idempotent, by slug: an article that exists is updated in place (views and
// publishedAt kept); one that does not exist but whose "replaces" slug does is
// renamed onto the new slug, so old links die with the old test stubs rather
// than leaving two copies; otherwise it is created. Nothing is ever deleted.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "content", "wiki");
const dry = process.argv.includes("--dry");
const STOCK_THUMB = "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/docs/CSBHMENZU.webp";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const articles = JSON.parse(readFileSync(path.join(dir, "articles.json"), "utf8"));
const seen = new Set();
let created = 0, updated = 0, renamed = 0;
try {
  for (const a of articles) {
    if (seen.has(a.slug)) throw new Error(`duplicate slug ${a.slug}`);
    seen.add(a.slug);
    const bodyPath = path.join(dir, `${a.slug}.html`);
    if (!existsSync(bodyPath)) throw new Error(`missing body ${bodyPath}`);
    const body = readFileSync(bodyPath, "utf8").replace(/\r\n/g, "\n").trim();
    const coverRel = `/images/docs/covers/${a.slug}.webp`;
    const thumbnailUrl = existsSync(path.join(root, "public", coverRel)) ? coverRel : STOCK_THUMB;
    const data = {
      title: a.title,
      category: a.category,
      excerpt: a.excerpt,
      body,
      thumbnailUrl,
      featured: Boolean(a.featured),
      sortOrder: Number(a.sortOrder ?? 0),
      productId: null,
    };

    const existing = await db.docArticle.findUnique({ where: { slug: a.slug }, select: { id: true } });
    if (existing) {
      if (!dry) await db.docArticle.update({ where: { id: existing.id }, data });
      updated += 1;
      console.log(`update  ${a.slug}`);
      continue;
    }
    const old = a.replaces?.length
      ? await db.docArticle.findFirst({ where: { slug: { in: a.replaces } }, select: { id: true, slug: true } })
      : null;
    if (old) {
      if (!dry) await db.docArticle.update({ where: { id: old.id }, data: { ...data, slug: a.slug } });
      renamed += 1;
      console.log(`rename  ${old.slug} -> ${a.slug}`);
      continue;
    }
    if (!dry) await db.docArticle.create({ data: { ...data, slug: a.slug, publishedAt: new Date() } });
    created += 1;
    console.log(`create  ${a.slug}`);
  }
  console.log(`${dry ? "DRY RUN: " : ""}${created} created, ${renamed} renamed, ${updated} updated`);
} finally {
  await db.$disconnect();
}
