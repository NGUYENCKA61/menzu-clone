/**
 * The refund promise printed under "Chính sách bảo hành & hoàn tiền": what
 * share of the price comes back when a tool fails its buyer, as a whole
 * percent.
 */

/** Absent from the request body — leave whatever the column holds. */
export const RATE_ABSENT = "absent";
/** Out of range or not a number — the caller answers 400. */
export const RATE_BAD = "bad";

export type RefundRateInput =
  | number
  | null
  | typeof RATE_ABSENT
  | typeof RATE_BAD;

/**
 * Reads the figure out of an admin request.
 *
 * "" is how the form says "we have not decided" and stores null — the same
 * convention the links use, and a different fact from 0, which is a shop
 * promising nothing back. Anything else out of range comes back as "bad"
 * rather than being clamped: a shop that typed 1000 meant something, and
 * silently writing 100 would put a promise on the page they never made.
 */
export function readRefundRate(value: unknown): RefundRateInput {
  if (value === undefined) return RATE_ABSENT;
  if (value === null || value === "") return null;
  // Booleans and empty arrays are numbers to Number(); none of them is a
  // percentage anybody typed.
  if (typeof value !== "number" && typeof value !== "string") return RATE_BAD;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 100) return RATE_BAD;
  return n;
}
