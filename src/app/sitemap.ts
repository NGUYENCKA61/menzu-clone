import type { MetadataRoute } from "next";

import { db } from "@/lib/db";
import { LISTED_PRODUCT } from "@/lib/queries";
import { SITE_URL } from "@/lib/seo";
import { categoryHref, productHref } from "@/lib/routes";

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
  ["/feedback", 0.5, "weekly"],
  // No /news: the live site links "TIN TỨC" from its header but the route
  // 404s there, so this clone 404s too rather than inventing a section.
  ["/docs", 0.4, "monthly"],
  ["/thong-bao", 0.4, "daily"],
  ["/cap-bac", 0.4, "monthly"],
  // No /security: it is one visitor's own account page and now says noindex,
  // and listing a noindex page here hands a crawler two contradictory orders.
  ["/bio", 0.3, "yearly"],
  ["/app/download", 0.3, "monthly"],
  // No /2fa either: setting up two-factor is an account errand, not a page a
  // stranger arrives at from a search.
  ["/checkwc", 0.3, "monthly"],
];

type Frequency = "daily" | "weekly" | "monthly" | "yearly";

// Built per request rather than hourly: the hourly version was prerendered at
// build time, and the Docker build has no database to read the catalogue from
// (see app/layout.tsx). Three small queries per crawler visit is nothing.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, docs] = await Promise.all([
    // Removed accounts are left out: their pages 404, and offering a crawler a
    // URL that answers 404 is the one thing a sitemap must not do.
    db.product.findMany({
      // Hidden products are left out beside the removed ones: their pages now
      // 404, and a sitemap that offers a crawler a URL answering 404 is the
      // one thing a sitemap must not do.
      where: LISTED_PRODUCT,
      select: {
        slug: true,
        updatedAt: true,
        category: { select: { slug: true } },
      },
    }),
    // Only categories with something in them. An empty one says "no products
    // yet" and nothing else, which a crawler would index as a thin page; it
    // joins the list the moment its first product is published, and leaves
    // again if the last one goes. The page itself says noindex on the same
    // rule (see [categorySlug]/page.tsx).
    db.category.findMany({
      where: { products: { some: LISTED_PRODUCT } },
      select: { slug: true, updatedAt: true },
    }),
    // Only articles that have been written: the empty ones are noindex, and
    // listing a noindex page here sends crawlers two contradictory signals.
    db.docArticle.findMany({
      where: { body: { not: null } },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  // The newest thing the shop has published. A static route's own copy does
  // not change on a schedule, so stamping it with "now" — which is what the
  // hourly revalidate made it do — told a crawler that every page had just
  // changed, every hour, forever. A signal that is always true carries no
  // information, and a crawler that learns to distrust it distrusts the whole
  // file. The catalogue's own latest edit is the honest answer.
  const freshest = [...categories, ...products, ...docs]
    .map((row) => row.updatedAt.getTime())
    .reduce((newest, at) => Math.max(newest, at), 0);
  const shopChanged = new Date(freshest || Date.now());

  return [
    ...STATIC_ROUTES.map(([path, priority, changeFrequency]) => ({
      url: `${SITE_URL}${path}`,
      lastModified: shopChanged,
      changeFrequency,
      priority,
    })),
    ...categories.map((category) => ({
      url: `${SITE_URL}${categoryHref(category.slug)}`,
      lastModified: category.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    // One address per product, whatever its type: the category it sits in and
    // its own slug. The two types used to need different prefixes here, and
    // guessing the wrong one put a 404 in the sitemap.
    ...products.map((product) => ({
      url: `${SITE_URL}${productHref(product.category.slug, product.slug)}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...docs.map((doc) => ({
      url: `${SITE_URL}/docs/${doc.slug}`,
      lastModified: doc.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
