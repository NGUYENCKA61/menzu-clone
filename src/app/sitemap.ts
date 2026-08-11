import type { MetadataRoute } from "next";

import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";

/**
 * Sitemap built from the live catalogue, not a hand-written list — stock turns
 * over constantly, and a stale sitemap teaches crawlers to distrust it.
 *
 * Sold accounts stay in: the page still resolves and still carries a valid
 * SoldOut offer, so dropping them would only create 404s in Search Console.
 */

/** Public routes with no dynamic segment. Auth pages are excluded on purpose. */
const STATIC_ROUTES: [path: string, priority: number, freq: Frequency][] = [
  ["/", 1, "daily"],
  ["/categories", 0.9, "daily"],
  ["/services", 0.8, "weekly"],
  ["/feedback", 0.5, "weekly"],
  // No /news: the live site links "TIN TỨC" from its header but the route
  // 404s there, so this clone 404s too rather than inventing a section.
  ["/docs", 0.4, "monthly"],
  ["/trade", 0.4, "monthly"],
  ["/security", 0.3, "yearly"],
  ["/bio", 0.3, "yearly"],
  ["/app/download", 0.3, "monthly"],
  ["/2fa", 0.3, "monthly"],
  ["/checkwc", 0.3, "monthly"],
];

type Frequency = "daily" | "weekly" | "monthly" | "yearly";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, services] = await Promise.all([
    db.product.findMany({ select: { code: true, updatedAt: true } }),
    db.category.findMany({ select: { slug: true, updatedAt: true } }),
    db.service.findMany({ select: { slug: true, updatedAt: true } }),
  ]);

  const now = new Date();

  return [
    ...STATIC_ROUTES.map(([path, priority, changeFrequency]) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    })),
    ...categories.map((category) => ({
      url: `${SITE_URL}/category/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: `${SITE_URL}/account/${product.code}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...services.map((service) => ({
      url: `${SITE_URL}/services/${service.slug}`,
      lastModified: service.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
