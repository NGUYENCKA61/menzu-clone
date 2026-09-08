import "server-only";

import type { CategoryCard } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/FeaturedCategories";
import type { DocCard } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/DocsSection";
import type { ProductCard } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/productRowData";
import { db } from "@/lib/db";
import { orderBySlugs, splitTileName } from "@/lib/homeSections";
import { categoryHref } from "@/lib/routes";

/**
 * The four tile rows on the homepage.
 *
 * They are not product listings — each tile links to a category or a service
 * and shows two summary stats. Both stat labels drive colour in ProductRow's
 * tone lookup, so they must stay exactly as the live site words them.
 */

/** One category as a tile. The single place a category becomes a card, so a
 *  category shown in three groups is described identically in all three. */
function toCard(
  c: {
    id: string;
    imageUrl: string | null;
    name: string;
    slug: string;
    description: string | null;
    platform: string | null;
    soldCount: number;
    stockCount: number;
  },
  minPrice?: Map<string, number>,
): ProductCard {
  return {
    image: c.imageUrl ?? "",
    title: c.name,
    description: c.description,
    platform: c.platform,
    minPrice: minPrice?.get(c.id) ?? null,
    href: categoryHref(c.slug),
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
 *
 * `count` caps each row at the admin's "cards per row"; a group named in
 * `unlimited` is handed every category it has instead — the game list
 * reveals itself three lines at a time on the page, so cutting it here would
 * hide games behind a button that never shows them.
 */
export async function getHomeGroups(
  count: number,
  unlimited: readonly string[] = [],
): Promise<HomeGroup[]> {
  const groups = await db.group.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      categories: { orderBy: { sortOrder: "asc" }, include: { category: true } },
    },
  });

  const ids = [
    ...new Set(groups.flatMap((g) => g.categories.map((link) => link.categoryId))),
  ];
  const minPrice = await cheapestPerCategory(ids);

  return groups
    .map((group) => ({
      id: group.id,
      slug: group.slug,
      name: group.name,
      cards: (unlimited.includes(group.slug)
        ? group.categories
        : group.categories.slice(0, count)
      ).map((link) => toCard(link.category, minPrice)),
    }))
    .filter((group) => group.cards.length > 0);
}

/**
 * The cheapest sellable thing in each category, for the tile's "Từ …đ".
 *
 * Two reads for the whole page rather than one per tile. Accounts carry their
 * price on the product; a tool costs whatever its cheapest package costs, and
 * no column on the product holds that — so the packages are read and folded
 * down here.
 *
 * Anything priced at a đồng or less is left out of the comparison and only
 * counted if NOTHING else is left: one category has a 1đ tier sitting beside
 * six paid tools, and taking the raw minimum would have advertised the whole
 * game as free.
 */
async function cheapestPerCategory(ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();

  const sellable = {
    categoryId: { in: ids },
    deletedAt: null,
    status: "AVAILABLE",
  } as const;

  const [accounts, packages] = await Promise.all([
    db.product.groupBy({
      by: ["categoryId"],
      _min: { price: true },
      where: { ...sellable, productType: "ACCOUNT_GAME", price: { gt: 1 } },
    }),
    db.productPackage.findMany({
      where: { product: { ...sellable, productType: "SOFTWARE_GAME" } },
      select: { price: true, product: { select: { categoryId: true } } },
    }),
  ]);

  const paid = new Map<string, number>();
  const free = new Set<string>();
  const keep = (id: string | null, value: number) => {
    if (!id) return;
    if (value <= 1) {
      free.add(id);
      return;
    }
    const seen = paid.get(id);
    if (seen === undefined || value < seen) paid.set(id, value);
  };

  for (const row of accounts) {
    if (row._min.price !== null) keep(row.categoryId, Number(row._min.price));
  }
  for (const row of packages) keep(row.product.categoryId, Number(row.price));

  // A category whose only tiers are free says so; one with a paid tier says
  // what that costs, whatever free tiers sit beside it.
  for (const id of free) if (!paid.has(id)) paid.set(id, 0);
  return paid;
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
      href: categoryHref(category.slug),
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
