import "server-only";

import type { ProductCard } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/productRowData";
import { db } from "@/lib/db";

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

async function categoryRow(slugs: string[]): Promise<ProductCard[]> {
  const rows = await db.category.findMany({ where: { slug: { in: slugs } } });
  const bySlug = new Map(rows.map((c) => [c.slug, c]));

  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({
      image: c.imageUrl ?? "",
      title: c.name,
      href: `/category/${c.slug}`,
      // The first row uses "Đã Bán"; TFT rows the live site labels "Loại SP"
      // when stock is what varies. Both map to tones in ProductRow.
      stats: [
        { label: "Đã Bán", value: String(c.soldCount) },
        { label: "Đang Bán", value: String(c.stockCount) },
      ] as [{ label: string; value: string }, { label: string; value: string }],
    }));
}

async function serviceRow(inGameSet: boolean): Promise<ProductCard[]> {
  const rows = await db.service.findMany({
    where: { isGameService: inGameSet },
    orderBy: { doneCount: "desc" },
  });
  return rows
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
 * The two category rows take their slugs from the shop settings, so an admin
 * can put a different category in a row without a deploy. The constants above
 * remain the defaults, which is what an unconfigured shop still renders.
 */
export async function getHomeRows(rows?: {
  valorantSlugs: string[];
  tftSlugs: string[];
}) {
  const [featured, tft, gameServices, otherServices] = await Promise.all([
    categoryRow(rows?.valorantSlugs ?? VALORANT_SLUGS),
    categoryRow(rows?.tftSlugs ?? TFT_SLUGS),
    serviceRow(true),
    serviceRow(false),
  ]);
  return { featured, tft, gameServices, otherServices };
}
