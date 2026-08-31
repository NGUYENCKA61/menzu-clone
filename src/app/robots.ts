import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/**
 * Signed-in areas are disallowed because they are per-user and useless in an
 * index — not as a security measure. Access control lives in the middleware
 * and in every handler; robots.txt is a public file and blocks nothing.
 */
const PRIVATE_PREFIXES = [
  "/admin",
  "/api",
  "/profile",
  "/wallet",
  "/orders",
  "/transactions",
  "/security",
  "/2fa",
  "/cart",
  "/affiliate",
  "/agency/dashboard",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
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
