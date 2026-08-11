/**
 * Flags images that were re-encoded smaller than the box they render in.
 *
 * scripts/optimize-images.mjs caps width per directory, and a wrong cap is
 * invisible until someone looks at the page: the login hero was crushed to
 * 256px because it sits in valorant-api/ alongside 40px agent icons.
 *
 *   node scripts/audit-images.mjs
 *
 * Heuristic: any image referenced from source that renders with `fill` or a
 * vw-based `sizes` needs real width behind it. Under 800px is suspicious for
 * those; small fixed-size icons are exempt by folder.
 */
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

import sharp from "sharp";

/** Folders whose images are genuinely small by design. */
const ICON_FOLDERS = ["feedback", "valorant-api/agents", "valorant-api/contenttiers", "bio", "logos"];

const SUSPICIOUS_BELOW = 800;

/** Must mirror MAX_WIDTH in scripts/optimize-images.mjs, most specific first. */
const MAX_WIDTH = {
  "valorant-api/bundles": 1600,
  "valorant-api": 256,
  account: 1280,
  upload: 1600,
  behance: 1920,
  site: 1280,
  external: 1280,
  feedback: 160,
  app: 1280,
  bio: 512,
  docs: 1280,
};

function widthFor(posixPath) {
  for (const [dir, width] of Object.entries(MAX_WIDTH)) {
    if (posixPath.includes(`${dir}/`)) return width;
  }
  return 1280;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

const source = walk("src")
  .filter((file) => /\.tsx?$/.test(file))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

const seeded = ["prisma/seed.ts", "prisma/docs-content.ts"]
  .map((file) => {
    try {
      return readFileSync(file, "utf8");
    } catch {
      return "";
    }
  })
  .join("\n");

const referenced = `${source}\n${seeded}`;
const findings = [];

for (const file of walk("public/sites").filter((f) => f.endsWith(".webp"))) {
  const posix = file.replace(/\\/g, "/");
  if (ICON_FOLDERS.some((folder) => posix.includes(`${folder}/`))) continue;

  const stem = basename(file, ".webp");
  // Seeded paths are built from a stem, so match on that rather than the URL.
  if (!referenced.includes(stem)) continue;

  const { width, height } = await sharp(file).metadata();
  if (width >= SUSPICIOUS_BELOW) continue;

  // A width sitting exactly on its folder's cap means the resize bit — the
  // source was larger and detail was thrown away. A width below the cap is
  // simply the source's own size, because the encoder never enlarges.
  const cap = widthFor(posix);
  const wasCapped = width === cap;

  findings.push({
    line: `${String(width).padStart(4)}x${height}  ${posix.replace("public/sites/", "")}`,
    wasCapped,
  });
}

const capped = findings.filter((f) => f.wasCapped);
const native = findings.filter((f) => !f.wasCapped);

if (capped.length === 0) {
  console.log("No images were downscaled below their render size.");
} else {
  console.log(`${capped.length} image(s) DOWNSCALED too far — raise the cap and re-fetch:`);
  for (const finding of capped) console.log(`  ${finding.line}`);
}

if (native.length > 0) {
  console.log(`\n${native.length} small but not downscaled (source is this size):`);
  for (const finding of native) console.log(`  ${finding.line}`);
}
