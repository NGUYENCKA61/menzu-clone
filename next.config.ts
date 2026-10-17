import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { NextConfig } from "next";

type PermanentRedirect = { source: string; destination: string; permanent: true };

/**
 * The old PHP shop's address shapes, sent to where the same thing lives here.
 *
 * Google holds years of links to the PHP site (/cate/<slug>, /auth/login,
 * /recharge/card ...), and until these rules existed each of them fell through
 * to [categorySlug]/[productSlug] and answered 200 "Không tìm thấy sản phẩm"
 * with noindex, so the standing those URLs earned would be thrown away the day
 * the old domain points at this app (the owner's SEO review, 13/10/2026).
 * They cost nothing before that day: no page here links to these shapes.
 *
 * Config redirects run before any page renders, so the answer is a real 308
 * rather than the meta refresh a streamed page falls back to, and the query
 * string rides along on its own, which is what keeps a referral ?ref= alive
 * through /auth/register. Order matters: the first rule that matches wins, so
 * the two renamed categories sit above the general /cate/:slug.
 *
 * /huong-dan/<slug> is not here: it was the old buy page, and which category a
 * product sits in is in the database, so src/app/huong-dan/[slug]/route.ts
 * looks it up. Every first segment named here is also in RESERVED_SLUGS, so a
 * category can never be created under an address these rules would steal.
 */
const LEGACY_PHP_REDIRECTS: PermanentRedirect[] = [
  // Category slugs the old site retired but Google still lists: "hack-cs2" is
  // the CS2 category, "hack-valorant-moi-" an earlier spelling of Valorant's.
  { source: "/cate/hack-cs2", destination: "/hack-cs2-counter-strike-2", permanent: true },
  { source: "/cate/hack-valorant-moi-", destination: "/hack-valorant-moi", permanent: true },
  // Every other category kept its slug, trailing dash included.
  { source: "/cate/:slug", destination: "/:slug", permanent: true },
  { source: "/auth/login", destination: "/login", permanent: true },
  { source: "/auth/register", destination: "/signup", permanent: true },
  { source: "/auth/forgot", destination: "/forgot-password", permanent: true },
  // /recharge/bank and /recharge/card were two tabs of one top-up page.
  { source: "/recharge/:path*", destination: "/wallet", permanent: true },
  { source: "/index.php", destination: "/", permanent: true },
];

/**
 * The glossary was one wiki article until it became its own page
 * (13/10/2026); 308 keeps the old links and search results working, and the
 * browser carries a #word across the redirect.
 *
 * The one deliberate exception to "a live article is never redirected away
 * from" (wikiRenameRedirects below): the old article keeps its row so it
 * still stands on the GLOSSARY shelf and in the featured cards, which link
 * straight to the page through docHref, and only its own address is retired.
 * The strings are written out because this file loads before the app's path
 * aliases exist; they mirror GLOSSARY_LEGACY_SLUG and GLOSSARY_SLUG in
 * src/lib/routes.ts.
 */
const GLOSSARY_REDIRECTS: PermanentRedirect[] = [
  { source: "/docs/thuat-ngu-chuc-nang-hack", destination: "/docs/thuat-ngu", permanent: true },
];

/**
 * Old wiki slugs, sent to the article that took their place.
 *
 * scripts/seed-wiki.mjs renames an article in place when its "replaces" slug
 * exists, and the docs route keeps no slug history, so without these the two
 * live, indexed articles it renames (acc-full-access-fa-la-gi and
 * acc-non-full-access-nfa-la-gi) would turn into 404s on the day the seed runs.
 * Read from the same articles.json the seed reads, so a rename added there
 * brings its redirect with it.
 *
 * Read with fs rather than imported: next.config is loaded outside the app
 * bundle, where JSON imports behave differently between Node's own loader and
 * Next's. A slug that some article answers on today is never redirected away,
 * because a config redirect runs before the page and would hide it forever.
 */
function wikiRenameRedirects(): PermanentRedirect[] {
  let articles: unknown;
  try {
    articles = JSON.parse(
      readFileSync(join(process.cwd(), "content", "wiki", "articles.json"), "utf8"),
    );
  } catch (error) {
    // Losing two redirects is better than failing a deploy over a content
    // file, but it is said out loud in the build log.
    console.warn("next.config: content/wiki/articles.json unreadable, no wiki redirects", error);
    return [];
  }
  if (!Array.isArray(articles)) return [];

  // Plain kebab-case only: a source is a path pattern, where ( : * + ? mean
  // something, and one malformed entry would fail the whole build.
  const isSlug = (value: unknown): value is string =>
    typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]*)*$/i.test(value);

  const entries = articles.flatMap((article: unknown) => {
    if (typeof article !== "object" || article === null) return [];
    const { slug, replaces } = article as { slug?: unknown; replaces?: unknown };
    if (!isSlug(slug)) return [];
    return [{ slug, olds: Array.isArray(replaces) ? replaces.filter(isSlug) : [] }];
  });
  const live = new Set(entries.map((entry) => entry.slug));

  const redirects: PermanentRedirect[] = [];
  const claimed = new Set<string>();
  for (const { slug, olds } of entries) {
    for (const old of olds) {
      if (live.has(old) || claimed.has(old)) continue;
      claimed.add(old);
      redirects.push({ source: `/docs/${old}`, destination: `/docs/${slug}`, permanent: true });
    }
  }
  return redirects;
}

/**
 * Security headers applied to every response.
 *
 * The Content-Security-Policy below has no script-src on purpose. Next injects
 * inline bootstrap scripts for hydration, so a real script policy needs a
 * per-request nonce threaded through middleware — a static one with
 * 'unsafe-inline' would look like protection while granting exactly what CSP
 * exists to prevent. The directives that need no nonce are still worth
 * having: they close the <base>-tag and plugin routes an injected fragment
 * could take, and back X-Frame-Options in browsers that read only CSP.
 */
const SECURITY_HEADERS = [
  // Stop browsers second-guessing declared content types, which is how a
  // user-uploaded file gets executed as script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the origin to other sites, the full URL only to ourselves — account
  // codes and ?next= targets should not leak into third-party referer logs.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The shop uses none of these; denying them removes the prompt entirely.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // Clickjacking: nothing here is meant to be embedded.
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  output: "standalone",

  // "X-Powered-By: Next.js" on every response names the framework to anyone
  // matching CVEs against fingerprints, and buys the shop nothing.
  poweredByHeader: false,

  /**
   * Hosts allowed to load `next dev`'s JavaScript.
   *
   * Next blocks `/_next/static/*` for any origin but localhost, so opening the
   * site from a phone or a second machine on the LAN served the server-rendered
   * HTML and then silently refused every chunk: the page looked right and no
   * button worked, because React never hydrated. The block is logged only in
   * this terminal, so from the other device there is nothing at all to read.
   *
   * The whole 192.168.1.x range rather than one address, because the machine's
   * own IP comes from DHCP and changes on its own. This affects `next dev`
   * only — a production build never reads it — and it grants nothing beyond
   * fetching dev assets to devices already inside the home network.
   */
  allowedDevOrigins: ["192.168.1.154", "192.168.1.*", "127.0.0.1", "desktop-6ahjaie", "DESKTOP-6AHJAIE"],

  images: {
    // WebP only, and first in the list, which is what decides the format —
    // Next takes the first entry the browser's Accept header matches. AVIF
    // does encode smaller at the same quality, and it was preferred here for
    // that reason; the sign-in artwork is judged on sharpness rather than
    // bytes, and its encoder is gentler with fine detail at high quality.
    formats: ["image/webp"],

    // Required from Next 16: only qualities on this list may be requested, so
    // that a stranger cannot make the server re-encode the catalogue at every
    // value from 1 to 100. 75 is the default the storefront uses; 95 is for
    // the sign-in panel, which is a single large picture behind a form and the
    // one place where softness would be visible.
    qualities: [75, 95],
    // A year — asset filenames carry the account code and are replaced, not
    // edited, so a stale cache entry cannot show the wrong image.
    minimumCacheTTL: 31536000,
  },

  async redirects() {
    return [...LEGACY_PHP_REDIRECTS, ...wikiRenameRedirects(), ...GLOSSARY_REDIRECTS];
  },

  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        // Hashed build output and immutable catalogue art. Everything under
        // /sites/ is content-addressed by account code and never edited.
        source: "/sites/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
