/**
 * Putting a list of dated things under the day they happened.
 *
 * The shop's own clock, not the reader's: a purchase made at 00:30 in Cần Thơ
 * belongs to that day for everyone looking at it, and a reader whose laptop
 * says UTC should not see it filed under yesterday.
 *
 * Shared because two lists already do this — the status history and the order
 * history — and a second copy of "is this today?" is a second chance to get
 * the midnight boundary wrong.
 */

/** The shop's clock, whatever machine renders the page. */
export const SHOP_TZ = "Asia/Ho_Chi_Minh";

/** The day a moment falls on, as a stable key: "31/08/2026". */
export function dayKey(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    timeZone: SHOP_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** "14:22" in the shop's clock. */
export function dayTime(date: Date): string {
  return date.toLocaleTimeString("vi-VN", {
    timeZone: SHOP_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * What to print over a day: "Hôm nay", "Hôm qua", or the date itself.
 *
 * `now` is passed in rather than read here so the caller renders one consistent
 * page — and so this can be tested without pretending it is a particular
 * Tuesday.
 */
export function dayLabel(key: string, now: Date): string {
  if (key === dayKey(now)) return "Hôm nay";
  if (key === dayKey(new Date(now.getTime() - 24 * 3600000))) return "Hôm qua";
  return key;
}

/** Both at once, for a row that only needs the heading it belongs under. */
export function dayHeading(date: Date, now: Date): string {
  return dayLabel(dayKey(date), now);
}

/**
 * A dated list in day groups, newest day first, order within a day untouched.
 *
 * Groups are built by walking the list rather than by bucketing into a map,
 * so the days come out in whatever order the list was already sorted in — the
 * caller decides what "first" means, and a list sorted oldest-first stays that
 * way instead of being silently reversed here.
 */
export function groupByDay<T>(
  items: T[],
  at: (item: T) => Date,
): { key: string; items: T[] }[] {
  const groups: { key: string; items: T[] }[] = [];
  for (const item of items) {
    const key = dayKey(at(item));
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return groups;
}
