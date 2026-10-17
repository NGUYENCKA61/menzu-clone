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

/**
 * LAB ONLY: made-up figures for the tiles whose category has no price or no
 * count, so every tile shows its "Chỉ từ ...đ, N sản phẩm" line while the
 * owner checks that the cards line up (17/10/2026: "cho dữ liệu test để tui
 * coi sự đồng bộ đi"). Display only, nothing is written anywhere. On when
 * LAB_SAMPLE_CARD_FIGURES=1 is set (lab 2's .env.local), never in a
 * production build. Drawn from the slug, so a tile keeps its numbers.
 */
const SAMPLE_CARD_FIGURES =
  process.env.LAB_SAMPLE_CARD_FIGURES === "1" && process.env.NODE_ENV !== "production";

function withSampleFigures(slug: string, figures?: CategoryFigures): CategoryFigures | undefined {
  if (!SAMPLE_CARD_FIGURES) return figures;
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    fromPrice: figures?.fromPrice ?? (20 + (h % 18) * 5) * 1000,
    count: figures && figures.count > 0 ? figures.count : 2 + (h % 9),
  };
}

/** One category as a tile. The single place a category becomes a card, so a
 *  category shown in three groups is described identically in all three. */
function toCard(
  c: {
    imageUrl: string | null;
    name: string;
    slug: string;
    description: string | null;
    platform: string | null;
    soldCount: number;
    stockCount: number;
  },
  shelf?: CategoryFigures,
): ProductCard {
  const figures = withSampleFigures(c.slug, shelf);
  return {
    image: c.imageUrl ?? "",
    title: c.name,
    description: c.description,
    platform: c.platform,
    fromPrice: figures?.fromPrice ?? null,
    count: figures?.count ?? null,
    href: categoryHref(c.slug),
    // Both stat labels drive colour in ProductRow's tone lookup, so they stay
    // exactly as the live site words them.
    stats: [
      { label: "Đã Bán", value: String(c.soldCount) },
      { label: "Đang Bán", value: String(c.stockCount) },
    ] as [{ label: string; value: string }, { label: string; value: string }],
  };
}

/** What a category's tile says about its shelf: the cheapest paid price and
 *  how many products are on sale (the owner, 13/10/2026: "chỉ từ bao nhiêu
 *  tiền cho card"). */
interface CategoryFigures {
  fromPrice: number | null;
  count: number;
}

/**
 * The figures for every category named, in one query over the products on
 * sale. A tool's price is its cheapest tier; an account's is its own price;
 * a free tool's 1đ placeholder tier is not a price and is left out, so a
 * category of free tools reads as having a count and no "từ".
 */
async function categoryFigures(
  categoryIds: readonly string[],
): Promise<Map<string, CategoryFigures>> {
  const figures = new Map<string, CategoryFigures>();
  if (categoryIds.length === 0) return figures;
  const products = await db.product.findMany({
    where: { deletedAt: null, status: "AVAILABLE", categoryId: { in: [...categoryIds] } },
    select: {
      categoryId: true,
      productType: true,
      price: true,
      packages: { select: { price: true } },
    },
  });
  for (const p of products) {
    const row = figures.get(p.categoryId) ?? { fromPrice: null, count: 0 };
    row.count += 1;
    const prices =
      p.productType === "SOFTWARE_GAME" && p.packages.length > 0
        ? p.packages.map((tier) => Number(tier.price))
        : [Number(p.price)];
    const paid = prices.filter((value) => value > 1);
    if (paid.length > 0) {
      const min = Math.min(...paid);
      row.fromPrice = row.fromPrice === null ? min : Math.min(row.fromPrice, min);
    }
    figures.set(p.categoryId, row);
  }
  return figures;
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

  const figures = await categoryFigures(
    [...new Set(groups.flatMap((group) => group.categories.map((link) => link.category.id)))],
  );

  return groups
    .map((group) => ({
      id: group.id,
      slug: group.slug,
      name: group.name,
      cards: (unlimited.includes(group.slug)
        ? group.categories
        : group.categories.slice(0, count)
      ).map((link) => toCard(link.category, figures.get(link.category.id))),
    }))
    .filter((group) => group.cards.length > 0);
}

/** One category's tile on /categories, and whether anything in it is on sale. */
export interface CatalogueTile {
  card: ProductCard;
  onSale: boolean;
}

/**
 * Every category as the home page's game list draws it, for /categories (the
 * owner, 13/10/2026, UI consistency review): the same card from the same
 * toCard and figures, so a game reads the same on both pages.
 *
 * In the admin's order, except that a category with nothing on sale goes to
 * the end; the page dims those rather than hiding them, so a game the shop
 * is restocking still has its page. A category without a picture is kept,
 * as the game list keeps it: its tile draws the frame and the name.
 */
export async function getCatalogueTiles(): Promise<CatalogueTile[]> {
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  const figures = await categoryFigures(categories.map((category) => category.id));
  const tiles = categories.map((category) => {
    const shelf = figures.get(category.id);
    return { card: toCard(category, shelf), onSale: (shelf?.count ?? 0) > 0 };
  });
  return [...tiles.filter((tile) => tile.onSale), ...tiles.filter((tile) => !tile.onSale)];
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
          where: { category: "GUIDE", productId: null },
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
