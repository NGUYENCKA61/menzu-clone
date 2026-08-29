/**
 * Handing licence keys over, and keeping track of what is still owed.
 *
 * A paid order is entitled to `keysOwed` keys from the tier it names. The shop
 * may not have that many on the shelf, and refusing the sale over it would
 * lose an order the buyer could pay for — so a sale takes what there is, and
 * whatever it could not take stays owed: `keysOwed` minus the keys pointing at
 * the order.
 *
 * The entitlement is stamped on the order rather than read off its quantity,
 * because "how many were bought" and "how many keys were promised" are not the
 * same fact. Every order predating this table bought its software without one,
 * and reading quantity would have queued all of them ahead of the buyer who
 * actually waited.
 */

import type { Prisma } from "@prisma/client";

/** Milliseconds in an hour, spelled out because the arithmetic below is mute. */
const HOUR_MS = 3_600_000;

/** The part of a Prisma client a transaction hands its callback. */
type Tx = Prisma.TransactionClient;

/** When a key handed over now stops working. Null tiers never expire. */
export function expiryFor(deliveredAt: Date, durationHours: number | null): Date | null {
  if (durationHours === null || durationHours <= 0) return null;
  return new Date(deliveredAt.getTime() + durationHours * HOUR_MS);
}

/**
 * Takes up to `wanted` keys off a tier's shelf and marks them delivered.
 *
 * `FOR UPDATE SKIP LOCKED` is the whole trick: two checkouts running at once
 * each lock the rows they claim and step over the ones the other holds, so
 * neither waits and neither can be handed the same key. A plain read followed
 * by an update would let both see the same row as available.
 *
 * Returns how many were actually delivered, which is `wanted` unless the shelf
 * ran out.
 */
export async function deliverKeys(
  tx: Tx,
  input: {
    packageId: string;
    orderId: string;
    userId: string;
    wanted: number;
    durationHours: number | null;
    deliveredAt?: Date;
  },
): Promise<number> {
  if (input.wanted <= 0) return 0;

  const claimed = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM license_keys
    WHERE "packageId" = ${input.packageId} AND status = 'AVAILABLE'
    ORDER BY "createdAt" ASC
    LIMIT ${input.wanted}
    FOR UPDATE SKIP LOCKED
  `;
  if (claimed.length === 0) return 0;

  const deliveredAt = input.deliveredAt ?? new Date();
  const result = await tx.licenseKey.updateMany({
    // The status is checked again on the way in. The lock above makes this
    // belt-and-braces, and it costs nothing to keep a row that changed hands
    // by some other route from being handed over twice.
    where: { id: { in: claimed.map((row) => row.id) }, status: "AVAILABLE" },
    data: {
      status: "SOLD",
      orderId: input.orderId,
      userId: input.userId,
      deliveredAt,
      expiresAt: expiryFor(deliveredAt, input.durationHours),
    },
  });

  return result.count;
}

/**
 * Delivers to the orders that went unserved, oldest first.
 *
 * Called after keys are added, so that restocking a tier is itself the act of
 * clearing its backlog — there is no second button to press and no way to add
 * stock while somebody who already paid goes on waiting.
 */
export async function fillBackorders(
  tx: Tx,
  packageId: string,
): Promise<{ orders: number; keys: number }> {
  const pkg = await tx.productPackage.findUnique({
    where: { id: packageId },
    select: { durationHours: true },
  });
  if (!pkg) return { orders: 0, keys: 0 };

  const available = await tx.licenseKey.count({
    where: { packageId, status: "AVAILABLE" },
  });
  if (available === 0) return { orders: 0, keys: 0 };

  const orders = await tx.order.findMany({
    where: { packageId, status: "PAID", keysOwed: { gt: 0 } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      userId: true,
      keysOwed: true,
      _count: { select: { licenseKeys: true } },
    },
  });

  let left = available;
  let filledOrders = 0;
  let filledKeys = 0;

  for (const order of orders) {
    if (left === 0) break;
    const owed = order.keysOwed - order._count.licenseKeys;
    if (owed <= 0) continue;

    const delivered = await deliverKeys(tx, {
      packageId,
      orderId: order.id,
      userId: order.userId,
      wanted: Math.min(owed, left),
      durationHours: pkg.durationHours,
    });
    if (delivered === 0) break;

    left -= delivered;
    filledKeys += delivered;
    filledOrders += 1;
  }

  return { orders: filledOrders, keys: filledKeys };
}

/** How many keys this tier still owes, across every paid order. */
export async function backorderCount(
  tx: Tx,
  packageId: string,
): Promise<number> {
  const orders = await tx.order.findMany({
    where: { packageId, status: "PAID", keysOwed: { gt: 0 } },
    select: { keysOwed: true, _count: { select: { licenseKeys: true } } },
  });
  return orders.reduce(
    (sum, o) => sum + Math.max(0, o.keysOwed - o._count.licenseKeys),
    0,
  );
}

/** Splits a pasted block into keys: one per line, blanks and repeats dropped. */
export function parseKeyBlock(text: string): string[] {
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const value = line.trim();
    if (value) seen.add(value);
  }
  return [...seen];
}
