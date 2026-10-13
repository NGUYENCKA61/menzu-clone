import "server-only";

import { db } from "@/lib/db";
import { buildInbox, INBOX_RECENT_DAYS, type InboxView } from "@/lib/warrantyInbox";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How many tickets are read before the panel picks its fifty. The same
 * ceiling the warranty queue reads with (/admin/warranty): a shop with more
 * open tickets than this has a bigger problem than the widget's list.
 */
const CANDIDATES = 300;

/**
 * The admin's floating inbox: every open ticket, and every ticket with a
 * message in the last week, as the widget lists them (buildInbox decides the
 * order and the cut).
 *
 * Only what the ticket's admin page shows anyway: the buyer's name and
 * picture, the order and the product, the report and the newest line. Never
 * a bank account and never an account's sign-in.
 */
export async function loadWarrantyInbox(now: Date = new Date()): Promise<InboxView> {
  const since = new Date(now.getTime() - INBOX_RECENT_DAYS * DAY_MS);
  // The tickets talked on this week, newest line first, picked by the line
  // and not by the ticket's age: an old ticket whose buyer has just written
  // must not fall outside a cut ordered by creation date.
  const talked = await db.warrantyMessage.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    distinct: ["requestId"],
    take: CANDIDATES,
    select: { requestId: true },
  });
  const rows = await db.warrantyRequest.findMany({
    where: {
      OR: [
        // Open, in warrantyOpen's words: anything not fixed and not paid back.
        { status: { notIn: ["RESOLVED", "REFUNDED"] } },
        { id: { in: talked.map((line) => line.requestId) } },
      ],
    },
    orderBy: { createdAt: "desc" },
    // Room for both reads in full: the open tickets and the ones talked on.
    take: CANDIDATES * 2,
    select: {
      id: true,
      status: true,
      createdAt: true,
      description: true,
      imageUrl: true,
      user: { select: { username: true, avatarUrl: true } },
      order: { select: { code: true, product: { select: { name: true, code: true } } } },
      // The last word only, as the queue reads it.
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { fromShop: true, body: true, createdAt: true },
      },
    },
  });

  return buildInbox(
    rows.map((row) => ({
      id: row.id,
      status: row.status,
      createdAt: row.createdAt,
      description: row.description,
      imageUrl: row.imageUrl,
      orderCode: row.order.code,
      productName: row.order.product.name ?? row.order.product.code,
      buyerName: row.user.username,
      buyerAvatar: row.user.avatarUrl,
      last: row.messages[0] ?? null,
    })),
    now,
  );
}
