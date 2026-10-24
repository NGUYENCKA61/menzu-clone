/**
 * Đột Kích's Rank Match tiers, lowest first, as the CrossFire wiki lists them
 * (the owner, 24/10/2026: "thêm lọc rank match", with the wiki's tier
 * badges). A tier's place is its index plus one; an account stores its place,
 * and 0 means no tier. The wiki's "(Win 100 times)" badges are the same tier
 * and are not split out.
 */
export const CF_RANK_MATCHES: string[] = [
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Master",
  "Grand Master",
  "Path of Glory",
  "Spirit of Glory",
  "Conqueror of Glory",
  "Top 100",
];

/** A tier place from the URL or a form (1 to CF_RANK_MATCHES.length), or undefined. */
export function rankMatchPlace(value?: string | null): number | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= CF_RANK_MATCHES.length ? n : undefined;
}

/** A stored place's tier name, or null for 0 (no tier) and anything off the ladder. */
export function rankMatchName(place: number): string | null {
  return CF_RANK_MATCHES[place - 1] ?? null;
}
