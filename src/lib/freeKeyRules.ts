/**
 * The rules of a free tool's key, pure so the page, the routes and the tests
 * read one copy (the owner, 12/10/2026: a free tool's own page, its key
 * behind the shop's paid shortlink).
 */

/** How long a "Lấy key" ticket stays good: time to pass the shortlink, not a day. */
export const FREE_CLAIM_TTL_MS = 2 * 60 * 60 * 1000;
/** One key per account per tool per day: the ad pays once a day, so does the shop. */
export const FREE_CLAIM_GAP_MS = 24 * 60 * 60 * 1000;

/**
 * The tier a free tool hands out: the shop's own convention is a tier priced
 * at the 1đ placeholder (or nothing). The cheapest such tier, or null when the
 * tool is not free at all.
 */
export function freePackageOf<T extends { price: number }>(
  packages: T[],
): T | null {
  let best: T | null = null;
  for (const p of packages) {
    if (p.price <= 1 && (best === null || p.price < best.price)) best = p;
  }
  return best;
}

/** When this account may take the tool's next key, or null if right now. */
export function nextFreeClaimAt(
  lastClaimedAt: Date | null,
  now: Date,
): Date | null {
  if (!lastClaimedAt) return null;
  const next = new Date(lastClaimedAt.getTime() + FREE_CLAIM_GAP_MS);
  return next.getTime() > now.getTime() ? next : null;
}

/** The line that tells the customer when the next free key may be taken. */
export function freeWaitWording(until: Date): string {
  const when = until.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
  return `Mỗi tài khoản nhận 1 key mỗi 24 giờ. Bạn lấy key tiếp được từ ${when}.`;
}

/** What a free tool's page is told about its reader, to draw the key panel. */
export type FreeToolPanel = {
  signedIn: boolean;
  /** Where a guest signs in, back to the tool's page. */
  loginHref: string;
  /** Whether the shop runs a shortlink: decides the steps shown and the wait. */
  gated: boolean;
  downloadUrl: string | null;
  /** The key this account already took today, if any: the page opens on it. */
  today: { orderCode: string; key: string | null; until: string } | null;
};
