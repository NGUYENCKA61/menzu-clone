/**
 * The pills beside a tool's detection state — "TOP #1 BÁN CHẠY", "MỚI RA MẮT".
 *
 * Stored as one text column holding one label per line, the same shape the
 * feature and requirement lists use. A column per badge would have made "let
 * the shop add a third" a migration; a line per badge makes it a number.
 */

/** How many the buy panel has room for beside the status pill. */
export const MAX_BADGES = 2;
/** Longer than this and the pill wraps onto a second line. */
export const MAX_BADGE_LENGTH = 40;

/** Stored text → the labels to print. Blank lines and spare labels dropped. */
export function parseBadges(stored: string | null): string[] {
  if (!stored) return [];
  return stored
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_BADGES);
}

/**
 * What the admin typed → the column, or null when nothing survives.
 *
 * Capped rather than refused: a badge is a slogan, and the only thing a long
 * one breaks is its own pill. Null rather than "" so an emptied form leaves
 * the column the way a tool that never had a badge leaves it.
 */
export function serializeBadges(input: unknown): string | null {
  if (!Array.isArray(input)) return null;
  const labels = input
    .map((v) => (typeof v === "string" ? v.trim().slice(0, MAX_BADGE_LENGTH) : ""))
    .filter(Boolean)
    .slice(0, MAX_BADGES);
  return labels.length > 0 ? labels.join("\n") : null;
}
