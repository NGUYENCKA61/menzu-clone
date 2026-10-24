/**
 * Đột Kích's ranks, lowest first, by their English names in the groups the
 * CrossFire wiki's Ranking page tabs them under (the owner, 24/10/2026: "tên
 * rank cứ tiếng anh đi", after the first, Vietnamese list turned out to hold
 * ranks the game does not have, Thượng úy and Thượng tá). In game each title
 * spans several grades ("Colonel 1st-8th Grade").
 *
 * An account's rank is free text ("Colonel 3", "ĐẠI TÁ 2"), so a rank matches
 * an account whose rank contains its name or one of its other names, unless
 * it also contains a longer rank holding that name: "General" must not catch
 * "Major General 2", nor "Sergeant" a "Staff Sergeant".
 */
export interface CfRank {
  name: string;
  /** Other ways an account's rank may be typed: the Vietnamese names the
   *  list first used, a spelled-out abbreviation, the badge's one-l Marshal. */
  also?: string[];
}

export const CF_RANK_GROUPS: { label: string; ranks: CfRank[] }[] = [
  {
    label: "Soldiers",
    ranks: [
      { name: "Trainee", also: ["Tân binh"] },
      { name: "Private", also: ["Binh nhì"] },
      { name: "PFC", also: ["Private First Class", "Binh nhất"] },
      { name: "Corporal", also: ["Hạ sĩ"] },
      { name: "Sergeant", also: ["Trung sĩ"] },
    ],
  },
  {
    label: "Petty Officer",
    ranks: [
      { name: "Staff Sergeant", also: ["Thượng sĩ"] },
      { name: "SFC", also: ["Sergeant First Class"] },
      { name: "Master Sergeant" },
    ],
  },
  {
    label: "Company Officer",
    ranks: [
      { name: "Second Lieutenant", also: ["Thiếu úy"] },
      { name: "First Lieutenant", also: ["Trung úy"] },
      { name: "Captain", also: ["Đại úy"] },
    ],
  },
  {
    label: "Field Officer",
    ranks: [
      { name: "Major", also: ["Thiếu tá"] },
      { name: "Lieutenant Colonel", also: ["Trung tá"] },
      { name: "Colonel", also: ["Đại tá"] },
    ],
  },
  {
    label: "General",
    ranks: [
      { name: "Brigadier General", also: ["Thiếu tướng"] },
      { name: "Major General", also: ["Trung tướng"] },
      { name: "Lieutenant General", also: ["Thượng tướng"] },
      { name: "General", also: ["Đại tướng"] },
      { name: "Marshall", also: ["Marshal", "Nguyên soái"] },
      { name: "Grand Marshall", also: ["Grand Marshal"] },
      { name: "Honor Marshall", also: ["Honor Marshal"] },
    ],
  },
];

const ALL: CfRank[] = CF_RANK_GROUPS.flatMap((group) => group.ranks);

/** Every rank's name, lowest first; a rank's place in the URL is its index plus one. */
export const CF_RANKS: string[] = ALL.map((rank) => rank.name);

/** A rank place from the URL (1 to CF_RANKS.length), or undefined. */
export function rankPlace(value?: string | null): number | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= CF_RANKS.length ? n : undefined;
}

/** The rank names from place `from` to place `to`, either end open. */
export function rankSpan(from?: number, to?: number): string[] {
  const start = (from ?? 1) - 1;
  const end = to ?? CF_RANKS.length;
  return CF_RANKS.slice(start, Math.max(start, end));
}

const namesOf = (rank: CfRank) => [rank.name, ...(rank.also ?? [])];

/**
 * What an account's rank must contain to be this rank (`words`, any one), and
 * what it must not (`not`): every other rank's name that holds one of the
 * words, so the longer rank keeps its own accounts.
 */
export function rankTerms(name: string): { words: string[]; not: string[] } {
  const rank = ALL.find((r) => r.name === name);
  if (!rank) return { words: [name], not: [] };
  const words = namesOf(rank);
  const lower = words.map((w) => w.toLowerCase());
  const not = ALL.filter((other) => other !== rank)
    .flatMap(namesOf)
    .filter((other) => lower.some((w) => other.toLowerCase().includes(w)));
  return { words, not };
}

/** rankTerms applied to a typed rank, the way the listing's query applies it. */
export function rankMatches(typed: string, name: string): boolean {
  const text = typed.toLowerCase();
  const { words, not } = rankTerms(name);
  return (
    words.some((w) => text.includes(w.toLowerCase())) &&
    !not.some((w) => text.includes(w.toLowerCase()))
  );
}
