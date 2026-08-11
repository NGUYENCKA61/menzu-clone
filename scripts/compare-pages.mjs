/**
 * Structural diff between a captured page from the live site and the same
 * route on the local clone.
 *
 * Compares what a page *does* — headings, interactive controls, form fields,
 * tab labels, internal destinations — rather than markup or styling. Class
 * names and wrapper divs differ constantly between a React app and its
 * reimplementation without meaning anything is wrong; a missing button means
 * something is.
 *
 *   node scripts/compare-pages.mjs [origin]
 *
 * Real pages come from docs/research/<site>/captures/<name>.html, produced by
 * scripts/capture-page.mjs. The clone is fetched live, so the dev server has
 * to be running (default http://localhost:3100).
 */
import { readFileSync } from "node:fs";

const CAPTURES = "docs/research/menzu-lol-f7ae197a/captures";
const ORIGIN = process.argv[2] ?? "http://localhost:3100";

/** capture file -> route on the clone. */
const PAGES = [
  ["home", "/"],
  ["category", "/category/account-valorant-tu-chon"],
  ["account", "/account/VLR2079"],
  ["services", "/services"],
  ["feedback", "/feedback"],
  ["login", "/login"],
  ["docs", "/docs"],
  ["bio", "/bio"],
  ["app-download", "/app/download"],
  ["2fa", "/2fa"],
  ["checkwc", "/checkwc"],
];

/** Text that is data, not structure — excluded so stock churn is not a diff. */
const VOLATILE = /^[\d.,\s]+$|^\d+[đ%]|đ$|^\+?\d+$/;

function stripNoise(html) {
  return html
    .replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

function textOf(fragment) {
  return fragment
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pulls the functional surface out of a page.
 *
 * Everything is upper-cased and de-duplicated: the two implementations
 * capitalise through CSS in places, and a label appearing twice is not a
 * meaningful difference.
 */
function features(html) {
  const clean = stripNoise(html);
  const grab = (pattern, transform = textOf) =>
    [...clean.matchAll(pattern)]
      .map((match) => transform(match[1] ?? ""))
      .map((value) => value.toUpperCase())
      .filter((value) => value.length > 1 && value.length < 60 && !VOLATILE.test(value));

  return {
    headings: new Set(grab(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi)),
    buttons: new Set(grab(/<button[^>]*>([\s\S]*?)<\/button>/gi)),
    inputs: new Set([
      ...grab(/<input[^>]*placeholder="([^"]*)"/gi, (v) => v),
      ...grab(/<textarea[^>]*placeholder="([^"]*)"/gi, (v) => v),
    ]),
    labels: new Set(grab(/<label[^>]*>([\s\S]*?)<\/label>/gi)),
    // Only the first path segment: slugs and codes differ per environment.
    routes: new Set(
      [...clean.matchAll(/href="(\/[^"?#]*)"/g)]
        .map((match) => `/${match[1].split("/")[1] ?? ""}`)
        .filter((route) => route !== "/"),
    ),
  };
}

function diff(real, clone) {
  const missing = [...real].filter((item) => !clone.has(item));
  const extra = [...clone].filter((item) => !real.has(item));
  return { missing, extra };
}

const KINDS = ["headings", "buttons", "inputs", "labels", "routes"];
let totalMissing = 0;

for (const [name, route] of PAGES) {
  let realHtml;
  try {
    realHtml = readFileSync(`${CAPTURES}/${name}.html`, "utf8");
  } catch {
    console.log(`\n## ${route}\n  SKIP — no capture at ${CAPTURES}/${name}.html`);
    continue;
  }

  let cloneHtml;
  try {
    const response = await fetch(`${ORIGIN}${route}`, { signal: AbortSignal.timeout(60_000) });
    cloneHtml = await response.text();
    if (!response.ok) {
      console.log(`\n## ${route}\n  HTTP ${response.status} from the clone`);
      continue;
    }
  } catch (error) {
    console.log(`\n## ${route}\n  FETCH FAILED — ${error.message}`);
    continue;
  }

  const realFeatures = features(realHtml);
  const cloneFeatures = features(cloneHtml);

  const report = [];
  for (const kind of KINDS) {
    const { missing, extra } = diff(realFeatures[kind], cloneFeatures[kind]);
    totalMissing += missing.length;
    if (missing.length) report.push(`  MISSING ${kind}: ${missing.join(" | ")}`);
    if (extra.length) report.push(`  extra   ${kind}: ${extra.join(" | ")}`);
  }

  console.log(`\n## ${route}`);
  console.log(report.length ? report.join("\n") : "  identical functional surface");
}

console.log(`\n${totalMissing} missing element(s) across ${PAGES.length} pages`);
