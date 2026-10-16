/**
 * The shop's own addresses: the canonical origin every absolute URL is built
 * on, and the hosts that count as this shop itself.
 *
 * Kept apart from lib/seo.tsx on purpose. The write-up sanitizer
 * (lib/docHtml.ts) asks only "is this link ours?", and every route that
 * sanitizes (the admin API, the assistant, the Telegram and Zalo shops) would
 * otherwise carry the JSON-LD builders and the whole glossary for that one
 * question. lib/seo.tsx re-exports both names, so its callers see no change.
 */

/**
 * Canonical origin, without a trailing slash.
 *
 * Set NEXT_PUBLIC_SITE_URL in production. Vercel exposes the deployment host
 * as VERCEL_URL (no scheme), which is the right fallback for preview builds;
 * localhost is the last resort so `next build` never fails on a fresh clone.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  // Netlify names the deployed address itself, which is the right answer on
  // the host this shop actually runs on — and without it a production build
  // that forgot the variable published canonical tags, a sitemap and a robots
  // file all pointing at localhost, which is an instruction to de-index the
  // whole site.
  process.env.URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
  "http://localhost:3000"
).replace(/\/$/, "");

// Said out loud once, at build time, because the symptom — every canonical
// pointing at a machine nobody can reach — is invisible until a search engine
// acts on it.
if (
  process.env.NODE_ENV === "production" &&
  SITE_URL.startsWith("http://localhost")
) {
  console.warn(
    "[seo] NEXT_PUBLIC_SITE_URL is not set: canonical tags, the sitemap and " +
      "robots.txt will all point at localhost.",
  );
}

/** A host without its "www.", or null for anything that is not an address. */
function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * The hosts that are this shop itself: the domain the app runs on, the old
 * PHP shop's domain that still holds the rankings, and whatever SITE_URL
 * names. A link to one of these is never "elsewhere" (profileLinks in
 * lib/seo.tsx) and never "another site" (the write-ups' nofollow,
 * lib/docHtml.ts).
 */
const SHOP_HOSTS = new Set(
  ["thichthihack.com", "thichthihackk.com", hostOf(SITE_URL)].filter(
    (host): host is string => host !== null,
  ),
);

/** Whether an absolute (or protocol-relative) address is the shop's own. */
export function isShopUrl(url: string): boolean {
  const host = hostOf(url.startsWith("//") ? `https:${url}` : url);
  return host !== null && SHOP_HOSTS.has(host);
}
