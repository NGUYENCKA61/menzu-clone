import "server-only";

import type { CategoryCard } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/FeaturedCategories";
import type { DocCard } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/DocsSection";
import type { ProductCard } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/productRowData";
import { db } from "@/lib/db";
import { orderBySlugs, splitTileName } from "@/lib/homeSections";

/**
 * The four tile rows on the homepage.
 *
 * They are not product listings — each tile links to a category or a service
 * and shows two summary stats. Both stat labels drive colour in ProductRow's
 * tone lookup, so they must stay exactly as the live site words them.
 */

/** One category as a tile. The single place a category becomes a card, so a
 *  category shown in three groups is described identically in all three. */
function toCard(c: {
  imageUrl: string | null;
  name: string;
  slug: string;
  description: string | null;
  soldCount: number;
  stockCount: number;
}): ProductCard {
  return {
    image: c.imageUrl ?? "",
    title: c.name,
    description: c.description,
    href: `/category/${c.slug}`,
    // Both stat labels drive colour in ProductRow's tone lookup, so they stay
    // exactly as the live site words them.
    stats: [
      { label: "Đã Bán", value: String(c.soldCount) },
      { label: "Đang Bán", value: String(c.stockCount) },
    ] as [{ label: string; value: string }, { label: string; value: string }],
  };
}

/** A group and the tiles it shows, ready to render. */
export interface HomeGroup {
  id: string;
  slug: string;
  name: string;
  cards: ProductCard[];
}

/**
 * The home page's category rows, read from the groups table.
 *
 * One query for every row on the page, however many rows the shop has made.
 * A category listed in three groups is fetched as three links to one row —
 * it is never copied, so its name, picture and counts cannot disagree between
 * one row and the next.
 *
 * A group with nothing in it is dropped rather than drawn as a heading over
 * an empty grid.
 */
export async function getHomeGroups(count: number): Promise<HomeGroup[]> {
  const groups = await db.group.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      categories: { orderBy: { sortOrder: "asc" }, include: { category: true } },
    },
  });

  return groups
    .map((group) => ({
      id: group.id,
      slug: group.slug,
      name: group.name,
      cards: group.categories.slice(0, count).map((link) => toCard(link.category)),
    }))
    .filter((group) => group.cards.length > 0);
}

/** The tiles for "Danh mục sản phẩm", from the categories the admin pinned. */
export async function getHomeCategoryCards(slugs: string[]): Promise<CategoryCard[]> {
  if (slugs.length === 0) return [];
  const rows = await db.category.findMany({ where: { slug: { in: slugs } } });
  return orderBySlugs(rows, slugs)
    // A category with no picture would draw an empty tile, and the tile is
    // mostly picture.
    .filter((category) => category.imageUrl)
    .map((category) => ({
      ...splitTileName(category.name),
      art: category.imageUrl!,
      href: `/category/${category.slug}`,
    }));
}

/** The cards for "Xem hướng dẫn", in the order the admin arranged them. */
export async function getHomeDocCards(slugs: string[]): Promise<DocCard[]> {
  // Unconfigured, the section leads with the guides — a reader who scrolls
  // this far is looking for how, not for policy.
  const picked =
    slugs.length > 0
      ? orderBySlugs(await db.docArticle.findMany({ where: { slug: { in: slugs } } }), slugs)
      : await db.docArticle.findMany({
          where: { category: "GUIDE" },
          orderBy: { sortOrder: "asc" },
          take: 4,
        });
  return picked.map((article) => ({
    slug: article.slug,
    title: article.title,
    category: article.category,
    excerpt: article.excerpt,
    thumbnailUrl: article.thumbnailUrl,
    views: article.views,
  }));
}
