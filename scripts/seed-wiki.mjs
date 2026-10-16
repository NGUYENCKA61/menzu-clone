// Seeds the wiki articles kept in content/wiki into the database.
//
//   node --env-file=.env scripts/seed-wiki.mjs [--dry] [--only slug1,slug2] [--allow-remote]
//
// content/wiki/articles.json lists each article's slug, shelf, title, excerpt,
// featured flag, sort order and the old slugs it replaces; the body is the
// .html file of the same slug; the cover is public/images/docs/covers/<slug>.webp
// (a 1200x630 card carrying the shelf and the title), falling back to the
// stock doc image.
//
// Idempotent, by slug: an article that exists is updated in place (views and
// publishedAt kept); one that does not exist but whose "replaces" slug does is
// renamed onto the new slug, so old links die with the old test stubs rather
// than leaving two copies; otherwise it is created. Nothing is ever deleted.
//
// --only a,b (also --only=a,b) seeds just those slugs and leaves every other
// row untouched, which is how a round that changed two articles ships without
// putting the ones the shop edited in admin back to their files. A slug that
// is not in articles.json stops the run before any write; the summary says how
// many articles were skipped. --dry still prints what would happen.
//
// The run refuses a DATABASE_URL that is not localhost or 127.0.0.1 unless
// --allow-remote is passed, because a full seed of the live database would
// overwrite every article the shop has touched since; on live it is always
// run as --allow-remote together with --only.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "content", "wiki");
const STOCK_THUMB = "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/docs/CSBHMENZU.webp";

const argv = process.argv.slice(2);
const dry = argv.includes("--dry");
const allowRemote = argv.includes("--allow-remote");
const only = readOnly(argv);

/** The slugs named by --only, or null when the whole shelf is wanted. */
function readOnly(args) {
  const values = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--only") {
      const next = args[i + 1];
      if (!next || next.startsWith("--")) throw new Error("--only needs a comma-separated list of slugs");
      values.push(next);
      i += 1;
    } else if (arg.startsWith("--only=")) {
      values.push(arg.slice("--only=".length));
    }
  }
  if (values.length === 0) return null;
  const slugs = values.flatMap((value) => value.split(",")).map((slug) => slug.trim()).filter(Boolean);
  if (slugs.length === 0) throw new Error("--only needs at least one slug");
  return new Set(slugs);
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
if (!allowRemote && !/localhost|127\.0\.0\.1/.test(url)) {
  console.error("DATABASE_URL is not a local database; pass --allow-remote (together with --only) to seed it.");
  process.exit(1);
}

const articles = JSON.parse(readFileSync(path.join(dir, "articles.json"), "utf8"));
if (only) {
  const known = new Set(articles.map((a) => a.slug));
  const unknown = [...only].filter((slug) => !known.has(slug));
  if (unknown.length > 0) {
    console.error(`unknown slug(s) in --only, not in articles.json: ${unknown.join(", ")}`);
    process.exit(1);
  }
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const seen = new Set();
let created = 0, updated = 0, renamed = 0, skipped = 0;
try {
  for (const a of articles) {
    if (seen.has(a.slug)) throw new Error(`duplicate slug ${a.slug}`);
    seen.add(a.slug);
    if (only && !only.has(a.slug)) {
      skipped += 1;
      continue;
    }
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
  if (only) console.log(`skipped ${skipped} (not in --only)`);
} finally {
  await db.$disconnect();
}
