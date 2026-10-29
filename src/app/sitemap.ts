import type { MetadataRoute } from "next";

import { db } from "@/lib/db";
import { LISTED_PRODUCT } from "@/lib/queries";
import { SITE_URL } from "@/lib/seo";
import { PC_SETUP_PAGES, pcSetupHref } from "@/lib/pcSetup";
import { categoryHref, GLOSSARY_LEGACY_SLUG, productHref, toolDocsHref } from "@/lib/routes";
import { hasOwnToolDoc } from "@/lib/toolDocsContent";

/**
 * Sitemap built from the live catalogue, not a hand-written list — stock turns
 * over constantly, and a stale sitemap teaches crawlers to distrust it.
 *
 * Sold accounts stay in: the page still resolves and still carries a valid
 * SoldOut offer, so dropping them would only create 404s in Search Console.
 */

/**
 * A calendar day, YYYY-MM-DD: the sitemap protocol takes a bare date, and a
 * time of day would claim a precision a hand-kept date does not have.
 */
type Day = `${number}-${number}-${number}`;

/**
 * Public routes with no dynamic segment. Auth pages are excluded on purpose.
 *
 * The last field is the day that page's own copy last changed, BUMPED BY HAND
 * when it is edited. These used to carry the newest updatedAt of any product,
 * and every sale or free-key claim bumps a product's updatedAt (soldCount), so
 * /bio "changed" with every order: the always-fresh signal Google learns to
 * ignore, for the whole file (the owner's SEO review, 13/10/2026). The dates
 * below are when each page file was last committed.
 */
const STATIC_ROUTES: [path: string, priority: number, freq: Frequency, lastmod: Day][] = [
  ["/", 1, "daily", "2026-10-02"],
  ["/categories", 0.9, "daily", "2026-10-13"],
  ["/feedback", 0.5, "weekly", "2026-10-02"],
  // No /news: the live site links "TIN TỨC" from its header but the route
  // 404s there, so this clone 404s too rather than inventing a section.
  // /docs moved on 13/10: the glossary card leads the shelf with a new title.
  ["/docs", 0.4, "monthly", "2026-10-13"],
  // The glossary, a page of its own rather than an article (13/10/2026). Its
  // words live in src/lib/glossary/terms.ts: bump this when they change.
  ["/docs/thuat-ngu", 0.5, "monthly", "2026-10-13"],
  ["/tai-lieu", 0.5, "weekly", "2026-10-13"],
  ["/thong-bao", 0.4, "daily", "2026-10-13"],
  ["/cap-bac", 0.4, "monthly", "2026-10-13"],
  // Worth indexing on its own: somebody who has just been messaged by a fake
  // account searches for the shop's real addresses, and this is the page that
  // answers that.
  ["/lien-he", 0.4, "monthly", "2026-10-02"],
  // No /security: it is one visitor's own account page and now says noindex,
  // and listing a noindex page here hands a crawler two contradictory orders.
  ["/bio", 0.3, "yearly", "2026-08-31"],
  // No /app/download: there is no build to download yet, and the page says
  // noindex until there is.
  // No /2fa either: setting up two-factor is an account errand, not a page a
  // stranger arrives at from a search.
  ["/checkwc", 0.3, "monthly", "2026-10-13"],
];

/**
 * The machine-preparation guides (src/lib/pcSetup.ts), by slug: the day each
 * one's text last changed, bumped by hand like the routes above. A guide
 * missing here goes out with no lastmod, which is honest, rather than a guess.
 */
const PC_SETUP_LASTMOD: Readonly<Record<string, Day>> = {
  "tat-windows-defender": "2026-10-12",
  "tat-secure-boot": "2026-10-12",
  "tat-core-isolation": "2026-10-12",
  "tat-tpm": "2026-10-12",
  "tat-anti-cheat-khac": "2026-10-12",
  "cai-runtime": "2026-10-12",
  "reset-hwid": "2026-10-12",
};

type Frequency = "daily" | "weekly" | "monthly" | "yearly";

/** One listing, one buyer: the only product whose updatedAt follows its page. */
function oneOffAccount(product: { productType: string; accountPool: boolean }): boolean {
  return product.productType === "ACCOUNT_GAME" && !product.accountPool;
}

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
        productType: true,
        accountPool: true,
        // For the documentation block below: a tool page lists only when it
        // has a guide or requirements of its own (hasOwnToolDoc).
        guide: true,
        requirements: true,
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
      // Tool articles are left out with the empty ones: their bodies are
      // behind a key, and the page says noindex.
      where: { body: { not: null }, productId: null },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  // A lastmod is only worth sending when it moves with the page's content: a
  // signal that is always fresh carries no information, and a crawler that
  // learns to distrust it distrusts the whole file. Stamping static pages with
  // "now", and later with the catalogue's newest updatedAt, both failed that.
  // A tool's updatedAt moves with every sale (soldCount), so tools and their
  // documentation pages go out with none until the catalogue records when the
  // shop last edited one. So does an "acc random" listing's, which sells by
  // the piece. A one-off account's moves when it sells, which is a real
  // change to its page (it goes SOLD), so those keep theirs.
  return [
    ...STATIC_ROUTES.map(([path, priority, changeFrequency, lastModified]) => ({
      url: `${SITE_URL}${path}`,
      lastModified,
      changeFrequency,
      priority,
    })),
    ...categories.map((category) => ({
      url: `${SITE_URL}${categoryHref(category.slug)}`,
      // No lastModified: a bulk admin edit stamps every shelf the same
      // minute, and eight identical dates read as noise, not news.
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    // One address per product, whatever its type: the category it sits in and
    // its own slug. The two types used to need different prefixes here, and
    // guessing the wrong one put a 404 in the sitemap.
    ...products.map((product) => ({
      url: `${SITE_URL}${productHref(product.category.slug, product.slug)}`,
      lastModified: oneOffAccount(product) ? product.updatedAt : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    // The old glossary article answers with a redirect to /docs/thuat-ngu
    // now, and a sitemap lists only addresses that answer 200.
    ...docs
      .filter((doc) => doc.slug !== GLOSSARY_LEGACY_SLUG)
      .map((doc) => ({
        url: `${SITE_URL}/docs/${doc.slug}`,
        lastModified: doc.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    // The documentation area: one page per tool that says something of its own
    // (the same hasOwnToolDoc the page's robots tag uses, so a thin page is
    // never both noindex and in the sitemap; the owner's SEO review,
    // 13/10/2026), and the machine-preparation pages, which change with
    // Windows, not the shop.
    ...products
      .filter((product) => product.productType === "SOFTWARE_GAME" && hasOwnToolDoc(product))
      .map((product) => ({
        url: `${SITE_URL}${toolDocsHref(product.slug)}`,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
    ...PC_SETUP_PAGES.map((page) => ({
      url: `${SITE_URL}${pcSetupHref(page.slug)}`,
      lastModified: PC_SETUP_LASTMOD[page.slug],
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];
}
