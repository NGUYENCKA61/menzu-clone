/**
 * How many questions the assistant answers, counted in assistant_hits, with
 * no database in here so the arithmetic can be tested. Two windows per
 * visitor (address, account) and two for the whole shop: a free allowance is
 * per shop, so twenty addresses each at their own limit would spend a day's
 * quota before lunch and leave the real customers "đang bận" until tomorrow.
 */

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

/** A visitor with a real question asks a handful; this is well past that. */
export const MAX_PER_IP = 25;
/** Looser for a signed-in customer: they have paid, or are about to. */
export const MAX_PER_USER = 60;
/**
 * The whole shop, per hour and per day: under the free tiers' daily ceilings
 * (Gemini's lite model allows about a thousand a day) with room to spare.
 */
export const MAX_SHOP_PER_HOUR = 150;
export const MAX_SHOP_PER_DAY = 800;

export type ThrottleCounts = {
  byIp: number;
  /** Null for a visitor who is not signed in. */
  byUser: number | null;
  shopHour: number;
  shopDay: number;
};

/** Why a question is refused, or null when it may be asked. */
export function throttleReason(c: ThrottleCounts): "shop" | "visitor" | null {
  if (c.shopHour >= MAX_SHOP_PER_HOUR || c.shopDay >= MAX_SHOP_PER_DAY) {
    return "shop";
  }
  if (c.byIp >= MAX_PER_IP) return "visitor";
  if (c.byUser !== null && c.byUser >= MAX_PER_USER) return "visitor";
  return null;
}
