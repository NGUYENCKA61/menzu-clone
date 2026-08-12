/**
 * Structural diff of the signed-in account pages.
 *
 * scripts/compare-pages.mjs only handles public routes: these redirect a
 * signed-out fetch to /login, so a plain comparison would diff the login page
 * against itself and report everything as fine.
 *
 *   node scripts/compare-account.mjs [origin]
 *
 * Creates a throwaway account on the clone, fetches each page with its cookie,
 * and diffs against the captures taken from the live site while signed in.
 * The account is deleted afterwards.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const CAPTURES = "docs/research/menzu-lol-f7ae197a/captures";
const ORIGIN = process.argv[2] ?? "http://localhost:3100";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** capture file -> route. */
const PAGES = [
  ["acc-profile", "/profile"],
  ["acc-wallet", "/wallet"],
  ["acc-orders", "/orders"],
  ["acc-transactions", "/transactions"],
  ["acc-service-orders", "/service-orders"],
  ["acc-security", "/security"],
  ["acc-cart", "/cart"],
  ["trade", "/trade"],
];

/** Values, not structure — excluded so balances and dates are not diffs. */
const VOLATILE = /^[\d.,\s]+$|^\d+[đ%]|đ$|^\+?\d+$|^\d{2}\/\d{2}/;

function features(html) {
  const clean = html
    .replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const text = (fragment) =>
    fragment
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

  const grab = (pattern, transform = text) =>
    [...clean.matchAll(pattern)]
      .map((match) => transform(match[1] ?? ""))
      .filter((value) => value.length > 1 && value.length < 60 && !VOLATILE.test(value));

  return {
    headings: new Set(grab(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi)),
    buttons: new Set(grab(/<button[^>]*>([\s\S]*?)<\/button>/gi)),
    labels: new Set(grab(/<label[^>]*>([\s\S]*?)<\/label>/gi)),
    inputs: new Set(grab(/<input[^>]*placeholder="([^"]*)"/gi, (v) => v.toUpperCase())),
    routes: new Set(
      [...clean.matchAll(/href="(\/[^"?#]*)"/g)]
        .map((match) => `/${match[1].split("/")[1] ?? ""}`)
        .filter((route) => route !== "/"),
    ),
  };
}

const username = `cmp_${randomBytes(4).toString("hex")}`;
const password = randomBytes(18).toString("base64url");

async function main() {
  const register = await fetch(`${ORIGIN}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!register.ok) throw new Error(`register failed: ${register.status}`);
  const cookie = register.headers.get("set-cookie")?.split(";")[0] ?? "";

  let missingTotal = 0;

  for (const [name, route] of PAGES) {
    let realHtml;
    try {
      realHtml = readFileSync(`${CAPTURES}/${name}.html`, "utf8");
    } catch {
      console.log(`\n## ${route}\n  SKIP — no capture`);
      continue;
    }

    const response = await fetch(`${ORIGIN}${route}`, {
      headers: { cookie },
      redirect: "manual",
      signal: AbortSignal.timeout(60_000),
    });
    if (response.status >= 300 && response.status < 400) {
      console.log(`\n## ${route}\n  REDIRECT ${response.status} -> ${response.headers.get("location")}`);
      continue;
    }
    const cloneHtml = await response.text();

    const real = features(realHtml);
    const clone = features(cloneHtml);
    const report = [];

    for (const kind of ["headings", "buttons", "labels", "inputs", "routes"]) {
      const missing = [...real[kind]].filter((item) => !clone[kind].has(item));
      const extra = [...clone[kind]].filter((item) => !real[kind].has(item));
      missingTotal += missing.length;
      if (missing.length) report.push(`  MISSING ${kind}: ${missing.join(" | ")}`);
      if (extra.length) report.push(`  extra   ${kind}: ${extra.join(" | ")}`);
    }

    console.log(`\n## ${route}`);
    console.log(report.length ? report.join("\n") : "  identical functional surface");
  }

  console.log(`\n${missingTotal} missing element(s)`);
}

async function cleanup() {
  const user = await db.user.findUnique({ where: { username } });
  if (!user) return;
  await db.tradeRequest.deleteMany({ where: { userId: user.id } });
  await db.transaction.deleteMany({ where: { userId: user.id } });
  await db.order.deleteMany({ where: { userId: user.id } });
  await db.session.deleteMany({ where: { userId: user.id } });
  await db.authAttempt.deleteMany({ where: { identifier: username.toLowerCase() } });
  await db.user.delete({ where: { id: user.id } });
}

main()
  .catch((error) => console.error(`ERROR: ${error.message}`))
  .finally(async () => {
    await cleanup().catch(() => {});
    await db.$disconnect();
  });
