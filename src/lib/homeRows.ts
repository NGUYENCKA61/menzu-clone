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

/** Categories carrying Valorant accounts (the first homepage row). */
const VALORANT_SLUGS = [
  "account-valorant-tu-chon",
  "random-valorant-20k-oi-thong-tin",
  "random-smuft-ban-rank-oi-thong-tin",
  "random-valorant-tren-lv-20-oi-thong-tin",
  "random-valorant-tren-lv-20-nfa",
];

/** TFT categories (the second row). */
const TFT_SLUGS = [
  "random-acc-tft",
  "acc-tft-pet-tim",
  "acc-tft-san-tim",
  "acc-tft-hang-hieu",
];


function formatVndString(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** One category as a tile. The single place a category becomes a card, so a
 *  category shown in three groups is described identically in all three. */
function toCard(c: {
  imageUrl: string | null;
  name: string;
  slug: string;
  soldCount: number;
  stockCount: number;
}): ProductCard {
  return {
    image: c.imageUrl ?? "",
    title: c.name,
    href: `/category/${c.slug}`,
    // Both stat labels drive colour in ProductRow's tone lookup, so they stay
    // exactly as the live site words them.
    stats: [
      { label: "Đã Bán", value: String(c.soldCount) },
      { label: "Đang Bán", value: String(c.stockCount) },
    ] as [{ label: string; value: string }, { label: string; value: string }],
  };
}

async function categoryRow(slugs: string[]): Promise<ProductCard[]> {
  const rows = await db.category.findMany({ where: { slug: { in: slugs } } });
  return orderBySlugs(rows, slugs).map(toCard);
}

/** A group and the tiles it shows, ready to render. */
export interface HomeGroup {
  id: string;
  slug: string;
  name: string;
  icon: string;
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
      icon: group.icon,
      cards: group.categories.slice(0, count).map((link) => toCard(link.category)),
    }))
    .filter((group) => group.cards.length > 0);
}

async function serviceRow(inGameSet: boolean, pinned: string[]): Promise<ProductCard[]> {
  const rows = await db.service.findMany({
    where: { isGameService: inGameSet },
    orderBy: { doneCount: "desc" },
  });
  // Pinned services keep the admin's order; an unconfigured shop keeps the
  // busiest first, which is how the row has always been sorted. A pin naming
  // the other section's service simply matches nothing here.
  const picked = pinned.length > 0 ? orderBySlugs(rows, pinned) : rows;
  return picked
    .map((s) => ({
      image: s.imageUrl ?? "",
      title: s.name,
      href: `/services/${s.slug}`,
      stats: [
        {
          label: s.priceLabel === "Liên hệ" ? "Báo giá" : "Giá từ",
          value: s.priceLabel ?? "Liên hệ",
        },
        { label: "Đã xong", value: `${formatVndString(s.doneCount)} đơn` },
      ] as [{ label: string; value: string }, { label: string; value: string }],
    }));
}

/**
 * Every row takes its contents from the shop settings, so an admin can change
 * what the home page shows without a deploy. The constants above remain the
 * defaults, which is what an unconfigured shop still renders.
 *
 * `count` trims each row to a length rather than filtering it: a shop with
 * twelve categories pinned and a count of four shows the first four, and
 * raising the count later brings the rest back without re-picking them.
 */
export async function getHomeRows(rows?: {
  valorantSlugs: string[];
  tftSlugs: string[];
  serviceSlugs: string[];
  count: number;
}) {
  const [featured, tft, gameServices, otherServices] = await Promise.all([
    categoryRow(rows?.valorantSlugs ?? VALORANT_SLUGS),
    categoryRow(rows?.tftSlugs ?? TFT_SLUGS),
    serviceRow(true, rows?.serviceSlugs ?? []),
    serviceRow(false, rows?.serviceSlugs ?? []),
  ]);
  const limit = rows?.count ?? Number.POSITIVE_INFINITY;
  return {
    featured: featured.slice(0, limit),
    tft: tft.slice(0, limit),
    gameServices: gameServices.slice(0, limit),
    otherServices: otherServices.slice(0, limit),
  };
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
