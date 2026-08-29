import "server-only";

import { db } from "@/lib/db";

/**
 * One tier's key store, read for the admin desks.
 *
 * Lifted out of the software product page when the tier grew a page of its
 * own — two screens print this store now, and each keeping its own reader
 * would be two definitions of "pending" to keep in agreement.
 */

/**
 * How much of a tier's key store a desk prints before it summarises.
 *
 * The shelf scrolls inside its own panel now, so the cap is no longer about
 * screen room — it is a backstop against a pathological paste (tens of
 * thousands of rows) flattening the page. A real shelf of hundreds lists in
 * full and scrolls.
 */
const SHELF_SHOWN = 1000;
const DELIVERED_SHOWN = 15;

function stamp(date: Date): string {
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Counts are queried rather than derived from the lists, which are capped: a
 * shop with four hundred keys in stock should still be told it has four
 * hundred, not the forty that fit on screen.
 */
export async function readKeyStore(packageId: string) {
  const now = new Date();
  const [available, sold, shelf, recent, paidOrders] = await Promise.all([
    db.licenseKey.count({ where: { packageId, status: "AVAILABLE" } }),
    db.licenseKey.count({ where: { packageId, status: "SOLD" } }),
    db.licenseKey.findMany({
      where: { packageId, status: "AVAILABLE" },
      orderBy: { createdAt: "asc" },
      take: SHELF_SHOWN,
      select: { id: true, value: true },
    }),
    db.licenseKey.findMany({
      where: { packageId, status: "SOLD" },
      orderBy: { deliveredAt: "desc" },
      take: DELIVERED_SHOWN,
      select: {
        id: true,
        value: true,
        deliveredAt: true,
        expiresAt: true,
        user: { select: { username: true } },
        order: { select: { code: true } },
      },
    }),
    // What is owed: what each paid order was promised, less what it got.
    // Orders from before the shop kept keys promised none and are skipped.
    db.order.findMany({
      where: { packageId, status: "PAID", keysOwed: { gt: 0 } },
      select: { keysOwed: true, _count: { select: { licenseKeys: true } } },
    }),
  ]);

  return {
    available,
    sold,
    pending: paidOrders.reduce(
      (sum, o) => sum + Math.max(0, o.keysOwed - o._count.licenseKeys),
      0,
    ),
    shelf: shelf.map((k) => ({ id: k.id, value: k.value })),
    recent: recent.map((k) => ({
      id: k.id,
      value: k.value,
      username: k.user?.username ?? "—",
      orderCode: k.order?.code ?? null,
      deliveredAt: k.deliveredAt ? stamp(k.deliveredAt) : "—",
      expiresAt: k.expiresAt ? stamp(k.expiresAt) : null,
      expired: k.expiresAt !== null && k.expiresAt < now,
    })),
    shelfTruncated: available > shelf.length,
  };
}
