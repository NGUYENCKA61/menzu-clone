/**
 * Re-encodes the captured menzu.lol assets to WebP at sensible dimensions.
 *
 * The originals are full-resolution screenshots — up to 3.9 MB — while the
 * largest place any of them renders is roughly 600px wide. Next.js does shrink
 * them on the fly, but only after decoding and re-encoding the original on the
 * first request, which leaves image frames empty on a cold load.
 *
 *   node scripts/optimize-images.mjs           # convert, keep originals
 *   node scripts/optimize-images.mjs --replace # convert and delete originals
 *
 * Writes <name>.webp beside each source. Nothing is deleted without --replace.
 */
import { readdir, rm, stat } from "node:fs/promises";
import { extname, join } from "node:path";

import sharp from "sharp";

const ROOT = "public/sites/menzu-lol-f7ae197a";
const REPLACE = process.argv.includes("--replace");

/**
 * Max width per directory, from the largest box each image renders in.
 * Doubled for high-DPI screens, then left to `sizes` to pick from there.
 *
 * Matched most-specific-first, which matters: valorant-api holds both 40px
 * agent avatars and full-bleed bundle art. Capping the whole folder at icon
 * width once crushed the login hero to 256px and it rendered visibly blocky
 * at 50vw. Judge a folder by what its images render at, not by its name.
 */
const MAX_WIDTH = {
  "valorant-api/bundles": 1600, // login and register hero, ~50vw
  "valorant-api": 256, // tier and agent icons
  account: 1280, // detail hero ~600px
  upload: 1600, // hero banner is full-bleed
  behance: 1920, // page backdrop
  site: 1280,
  external: 1280,
  feedback: 160, // 40px avatars
  app: 1280,
  bio: 512,
  docs: 1280,
};

const SKIP_EXT = new Set([".webp", ".gif", ".svg", ".ttf", ".woff", ".woff2"]);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

function widthFor(path) {
  // Normalised so a multi-segment key like "valorant-api/bundles" matches on
  // Windows too, where the walker hands back backslash-separated paths.
  const normalised = path.replace(/\\/g, "/");
  for (const [dir, width] of Object.entries(MAX_WIDTH)) {
    if (normalised.includes(`${dir}/`)) return width;
  }
  return 1280;
}

let converted = 0;
let before = 0;
let after = 0;
const failures = [];

for await (const file of walk(ROOT)) {
  const ext = extname(file).toLowerCase();
  if (SKIP_EXT.has(ext)) continue;
  if (![".png", ".jpg", ".jpeg"].includes(ext)) continue;

  const target = file.slice(0, -ext.length) + ".webp";

  try {
    const original = (await stat(file)).size;
    await sharp(file)
      .resize({ width: widthFor(file), withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toFile(target);

    const size = (await stat(target)).size;
    before += original;
    after += size;
    converted += 1;

    if (REPLACE) await rm(file);
    process.stdout.write(`\r${converted} converted`);
  } catch (error) {
    failures.push(`${file}: ${error.message}`);
  }
}

process.stdout.write("\n");
console.log(
  `${converted} images  ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB` +
    `  (${Math.round((1 - after / before) * 100)}% smaller)`,
);
if (REPLACE) console.log("originals deleted");
if (failures.length) {
  console.log(`\n${failures.length} failed:`);
  for (const f of failures) console.log(`  ${f}`);
}
