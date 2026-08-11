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

/** Services shown under "Dịch Vụ Game" vs "Dịch Vụ Khác". */
const GAME_SERVICE_SLUGS = ["riotgames", "valorantpoint-vn", "valorantpoint-ph"];

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
      // The first row uses "Đã Bán"; TFT rows the live site labels "Loại SP"
      // when stock is what varies. Both map to tones in ProductRow.
      stats: [
        { label: "Đã Bán", value: String(c.soldCount) },
        { label: "Đang Bán", value: String(c.stockCount) },
      ] as [{ label: string; value: string }, { label: string; value: string }],
    }));
}

async function serviceRow(inGameSet: boolean): Promise<ProductCard[]> {
  const rows = await db.service.findMany({ orderBy: { doneCount: "desc" } });
  return rows
    .filter((s) => GAME_SERVICE_SLUGS.includes(s.slug) === inGameSet)
    .map((s) => ({
      image: s.imageUrl ?? "",
      title: s.name,
      stats: [
        {
          label: s.priceLabel === "Liên hệ" ? "Báo giá" : "Giá từ",
          value: s.priceLabel ?? "Liên hệ",
        },
        { label: "Đã xong", value: `${formatVndString(s.doneCount)} đơn` },
      ] as [{ label: string; value: string }, { label: string; value: string }],
    }));
}

export async function getHomeRows() {
  const [featured, tft, gameServices, otherServices] = await Promise.all([
    categoryRow(VALORANT_SLUGS),
    categoryRow(TFT_SLUGS),
    serviceRow(true),
    serviceRow(false),
  ]);
  return { featured, tft, gameServices, otherServices };
}
