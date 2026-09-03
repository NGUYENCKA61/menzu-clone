import "server-only";

import { db } from "@/lib/db";
import type { ShopSettings } from "@/lib/settings";

/**
 * The four figures on the strip above the reviews: orders delivered,
 * customers, years in business, average rating.
 *
 * Each one is what the desk typed in Cấu hình, and where it typed nothing,
 * what the database can vouch for — paid orders on this site, accounts
 * registered, the year of the oldest account, the mean of approved reviews.
 * The typed figure exists because the shop's history is longer than this
 * site's: the orders of the old PHP shop were never imported, and a strip
 * that said "5 orders delivered" over a shop with eight thousand customers
 * would have been true and absurd at once. A figure that is null is simply
 * not drawn; the strip needs two of them to be worth drawing at all.
 */
export interface TrustStats {
  orders: number | null;
  customers: number | null;
  years: number | null;
  rating: number | null;
}

/**
 * What the old PHP shop had done before this site took over, counted in its
 * dump of 2026-09-02 (private/old.sql, never committed): 21,285 rows in
 * tbl_history_hack — one per hack bought — the oldest dated 2023-02-09. The
 * orders themselves were never imported (their keys belong to a system that
 * no longer exists), so the history lives on as two numbers: the paid orders
 * of this site are added on top, and the years count from that first sale.
 */
const LEGACY_ORDERS = 21_285;
const LEGACY_START_YEAR = 2023;

/** "402.000", "402,000", "402000+" all read as 402000; blank or junk as null. */
function typed(value: string): number | null {
  const digits = value.replace(/[^\d.]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function getTrustStats(settings: ShopSettings): Promise<TrustStats> {
  const typedOrders = typed(settings.statOrders);
  const [orders, customers, oldest, averageRating] = await Promise.all([
    typedOrders ?? db.order.count({ where: { status: "PAID" } }).then((n) => LEGACY_ORDERS + n),
    typed(settings.statCustomers) ?? db.user.count(),
    typed(settings.statStartYear)
      ? null
      : db.user.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    typed(settings.statRating) ??
      db.feedback
        .aggregate({ _avg: { rating: true }, where: { approved: true } })
        .then((r) => r._avg.rating),
  ]);

  const startYear =
    typed(settings.statStartYear) ??
    Math.min(LEGACY_START_YEAR, oldest?.createdAt.getFullYear() ?? LEGACY_START_YEAR);
  const years = startYear ? Math.max(1, new Date().getFullYear() - startYear) : null;

  // With the old shop's history under it the live figure is always worth
  // showing; the floor only guards a fresh install with no history at all.
  const ordersWorthShowing = typedOrders !== null || (orders ?? 0) >= 100;

  return {
    orders: ordersWorthShowing && orders && orders > 0 ? orders : null,
    customers: customers && customers > 0 ? customers : null,
    years,
    // One decimal, and never above five: a typed "48" is a typo, not a score.
    rating:
      averageRating && averageRating > 0 ? Math.min(5, Math.round(averageRating * 10) / 10) : null,
  };
}
