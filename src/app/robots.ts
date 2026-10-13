import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/**
 * Signed-in areas are disallowed because they are per-user and useless in an
 * index — not as a security measure. Access control lives in the middleware
 * and in every handler; robots.txt is a public file and blocks nothing.
 *
 * The public pages that say noindex (/login, /signup, /forgot-password,
 * /reset-password, /cart, /2fa) are deliberately NOT here. A crawler that is
 * disallowed never fetches the page, so it never reads the noindex, and a URL
 * every header links to can then be indexed bare, as "Indexed, though blocked
 * by robots.txt". Letting them be fetched is what makes their noindex work
 * (the owner's SEO review, 13/10/2026).
 */
const PRIVATE_PREFIXES = [
  "/admin",
  "/api",
  "/profile",
  "/wallet",
  "/orders",
  "/transactions",
  "/security",
  "/affiliate",
  "/agency/dashboard",
  // The one exception to the rule above: /free-key/<id> also says noindex,
  // but opening it spends a free-key claim, and its addresses are only ever
  // reached through the shop's shortlinks. Keeping compliant bots from
  // fetching it matters more than their reading the noindex. The trailing
  // slash keeps a category whose slug merely starts with "free-key" crawlable.
  "/free-key/",
  // No /topup or /voucher: neither route exists, and a rule naming a page
  // that was never built only makes this file harder to read against the
  // routes that are actually here.
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE_PREFIXES }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
