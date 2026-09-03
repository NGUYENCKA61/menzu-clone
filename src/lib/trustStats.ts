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
    typedOrders ?? db.order.count({ where: { status: "PAID" } }),
    typed(settings.statCustomers) ?? db.user.count(),
    typed(settings.statStartYear)
      ? null
      : db.user.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    typed(settings.statRating) ??
      db.feedback
        .aggregate({ _avg: { rating: true }, where: { approved: true } })
        .then((r) => r._avg.rating),
  ]);

  const startYear = typed(settings.statStartYear) ?? oldest?.createdAt.getFullYear() ?? null;
  const years = startYear ? Math.max(1, new Date().getFullYear() - startYear) : null;

  // A count this site can vouch for is honest at 5 and absurd on a strip;
  // the desk types the old shop's total to make the figure worth showing.
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
