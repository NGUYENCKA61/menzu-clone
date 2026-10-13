/**
 * Where things live, in one place.
 *
 * The shop is three tiers deep — group, category, product — but only two of
 * them are addresses. A group (Hot Trending Tháng Này, Danh Sách Hack Game) is
 * a shelf on the home page, and a category may stand on several shelves at
 * once, so putting a group in the URL would give one product as many addresses
 * as it has shelves. Categories and products carry slugs; groups carry none.
 */

import { slugify } from "@/lib/slug";

/** /hack-pubg */
export function categoryHref(categorySlug: string): string {
  return `/${categorySlug}`;
}

/** /hack-pubg/hack-pubg-ban-desync — the product's one canonical address. */
/** A tool's documentation: /tai-lieu/{product-slug} (the owner, 12/10/2026). */
export function toolDocsHref(productSlug: string): string {
  return `/tai-lieu/${productSlug}`;
}

export function productHref(categorySlug: string, productSlug: string): string {
  return `/${categorySlug}/${productSlug}`;
}

/**
 * The glossary's own page, /docs/thuat-ngu (the owner, 13/10/2026: the
 * terminology page after unnamedtech's wiki). A static segment, so it is
 * matched before docs/[slug] and no article may ever take this slug: the
 * admin's slug minting treats it as taken.
 */
export const GLOSSARY_SLUG = "thuat-ngu";

/**
 * The article the glossary used to be. Its row stays, so it still stands on
 * the GLOSSARY shelf and in the featured cards, but its address now answers
 * with a permanent redirect to the page (next.config.ts).
 */
export const GLOSSARY_LEGACY_SLUG = "thuat-ngu-chuc-nang-hack";

/** A wiki article's public address; the old glossary article goes straight
 *  to the glossary page instead of through its redirect. */
export function docHref(slug: string): string {
  return slug === GLOSSARY_LEGACY_SLUG ? `/docs/${GLOSSARY_SLUG}` : `/docs/${slug}`;
}

/**
 * Every first segment the application already answers on.
 *
 * Categories live at the root, so a category slugged "cart" or "login" would
 * be permanently shadowed by the page of that name — Next.js matches a static
 * segment before a dynamic one. The category desk refuses these rather than
 * letting the shop create a page it can never open.
 *
 * Kept as a written list rather than read from the filesystem: this has to
 * hold on the server and in the browser, and being told at creation time is
 * the only moment the answer is useful.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "2fa",
  "account",
  "admin",
  "affiliate",
  "agency",
  "api",
  "app",
  "bio",
  "cap-bac",
  "cart",
  "categories",
  "category",
  "checkwc",
  "docs",
  "favicon.ico",
  "feedback",
  "forgot-password",
  "login",
  "manifest.webmanifest",
  "orders",
  "profile",
  "register",
  "reset-password",
  "robots.txt",
  "security",
  "signup",
  "sitemap.xml",
  "software",
  "tai-lieu",
  "thong-bao",
  "transactions",
  "vong-quay",
  "wallet",
  // Pages added after this list was written, which it had not caught up with.
  "free-key",
  "lien-he",
  "uploads",
  // The old PHP shop's address shapes, which next.config.ts redirects and
  // huong-dan/[slug]/route.ts answers (the owner's SEO review, 13/10/2026).
  // A category under one of these would be unreachable at its own address.
  "auth",
  "cate",
  "huong-dan",
  "index.php",
  "recharge",
  // Not routes today, but reserving them keeps the door open without a
  // migration later — and none reads as a category name anyone would want.
  "_next",
  "search",
  "checkout",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

/**
 * A slug for a new product, from whatever the shop typed as its name.
 *
 * `taken` is every slug already in use; a clash gets a counter rather than a
 * random suffix, so two products called the same thing read as -2 and -3 and
 * the shop can see why. Falls back to the code when a name is all punctuation
 * or absent, which is the case for accounts — they have no name at all.
 */
export function uniqueProductSlug(
  name: string | null,
  code: string,
  taken: Iterable<string>,
): string {
  const base = slugify(name ?? "") || slugify(code) || "san-pham";
  const used = new Set(taken);
  if (!used.has(base)) return base;

  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  // A thousand products of the same name is not a case worth a nicer answer,
  // but it still has to be an answer rather than a crash mid-checkout.
  return `${base}-${Date.now()}`;
}
