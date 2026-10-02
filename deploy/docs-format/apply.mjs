// Applies the reformatted wiki bodies in bodies-*.json to a database.
//
//   node deploy/docs-format/apply.mjs --capture     fill each `before` from the DB (once)
//   node deploy/docs-format/apply.mjs --dry         say what would change, change nothing
//   node deploy/docs-format/apply.mjs               apply
//   node deploy/docs-format/apply.mjs --restore     put every `before` back (undo)
//
// A row is rewritten only while its body is exactly the text it was
// formatted from: an article the shop has edited since is left alone and
// reported, never overwritten. Run from the repo root. DATABASE_URL comes
// from the environment, else from ./.env; anything but a local database
// needs --allow-remote, so the live shop is only ever touched on purpose.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const here = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const file = join(here, readdirSync(here).filter((f) => /^bodies-.*\.json$/.test(f)).sort().at(-1));
const data = JSON.parse(readFileSync(file, "utf8"));

let url = process.env.DATABASE_URL;
if (!url && existsSync(".env")) {
  url = readFileSync(".env", "utf8").match(/^DATABASE_URL="?([^"\r\n]+)"?/m)?.[1];
}
if (!url) throw new Error("DATABASE_URL is not set");
if (!/localhost|127\.0\.0\.1/.test(url) && !args.has("--allow-remote")) {
  throw new Error("not a local database: pass --allow-remote to run against it");
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

try {
  if (args.has("--capture")) {
    for (const article of data.articles) {
      if (article.before !== undefined) continue;
      const row = await db.docArticle.findUnique({ where: { slug: article.slug }, select: { body: true } });
      if (!row) throw new Error(`no article ${article.slug}`);
      article.before = row.body;
    }
    writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    console.log(`captured into ${file}`);
  } else {
    const restore = args.has("--restore");
    const dry = args.has("--dry");
    for (const article of data.articles) {
      if (article.before === undefined) throw new Error(`${article.slug}: run --capture first`);
      const from = restore ? article.after : article.before;
      const to = restore ? article.before : article.after;
      const row = await db.docArticle.findUnique({ where: { slug: article.slug }, select: { id: true, body: true } });
      if (!row) {
        console.log(`MISSING  ${article.slug}`);
      } else if (row.body === to) {
        console.log(`ALREADY  ${article.slug}`);
      } else if (row.body !== from) {
        console.log(`SKIPPED  ${article.slug} (edited since; left alone)`);
      } else if (dry) {
        console.log(`WOULD    ${article.slug}`);
      } else {
        // The body in the WHERE too: an edit landing between the read and
        // this write makes it match nothing instead of being overwritten.
        const done = await db.docArticle.updateMany({ where: { id: row.id, body: from }, data: { body: to } });
        console.log(`${done.count === 1 ? "DONE    " : "RACED   "} ${article.slug}`);
      }
    }
  }
} finally {
  await db.$disconnect();
}
