/**
 * How long a buyer may read a tool's documentation (the owner, 12/10/2026:
 * "với key ngày nếu k thuê mới sau 2 ngày k coi đc tài liệu và phần thiết
 * lập. Với key tháng là 1 tháng, key tuần là 1 tuần"): from each paid order,
 * the key's own duration, but never less than two days; a new key opens a
 * new window. A key with no duration (vĩnh viễn) opens it for good. Pure, so
 * the route, the product page and the tests share one reading of the rule.
 */

/** The least a key buys: two days of reading, whatever its duration. */
export const DOCS_MIN_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

/** Durations past this are the shop's way of writing "forever". */
const FOREVER_HOURS = 24 * 365 * 5;

export type DocsAccessState = "guest" | "never" | "expired" | "open";

export type DocsAccess = {
  state: DocsAccessState;
  /** When the reading ends, ISO; null while open means it never does. */
  until: string | null;
};

/** When one order's reading ends; null means never. */
export function docsWindowEnd(
  orderAt: Date,
  durationHours: number | null,
): Date | null {
  if (durationHours === null || durationHours >= FOREVER_HOURS) return null;
  const span = Math.max(DOCS_MIN_WINDOW_MS, durationHours * 60 * 60 * 1000);
  return new Date(orderAt.getTime() + span);
}

/**
 * The account's standing with a tool's docs, from its paid orders of that
 * tool: open while any window is still running (the one that runs longest
 * is the one named), expired once all have passed, never when there are
 * none. A guest is decided by the caller, who knows there is no account.
 */
export function docsAccessFrom(
  orders: { createdAt: Date; durationHours: number | null }[],
  now: Date = new Date(),
): DocsAccess {
  if (orders.length === 0) return { state: "never", until: null };
  let forever = false;
  let latest: Date | null = null;
  for (const order of orders) {
    const end = docsWindowEnd(order.createdAt, order.durationHours);
    if (end === null) forever = true;
    else if (latest === null || end.getTime() > latest.getTime()) latest = end;
  }
  if (forever) return { state: "open", until: null };
  if (latest && latest.getTime() > now.getTime()) {
    return { state: "open", until: latest.toISOString() };
  }
  return { state: "expired", until: latest?.toISOString() ?? null };
}

/** "14:30 15/10/2026" in the shop's clock. */
export function docsUntilLabel(until: string): string {
  return new Date(until).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** The one-line rule, as the pages repeat it. */
export const DOCS_RULE_SENTENCE =
  "Tài liệu mở theo thời hạn key: key ngày xem được 2 ngày, key tuần 1 tuần, key tháng 1 tháng, thuê key mới là mở lại.";
