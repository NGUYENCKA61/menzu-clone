/**
 * Đột Kích's ranks, lowest first, in the groups the account filter shows them
 * under (the owner, 24/10/2026: "thêm lọc rank nữa", after the VIP picker).
 * An account's rank is free text ("Đại Tá", "ĐẠI TÁ 2"), so a rank matches
 * any account whose rank contains its name, case aside; no name here contains
 * another, so "Trung tá" never catches "Thượng tá".
 */
export const CF_RANK_GROUPS: { label: string; ranks: string[] }[] = [
  { label: "Binh sĩ", ranks: ["Tân binh", "Binh nhì", "Binh nhất"] },
  { label: "Hạ sĩ quan", ranks: ["Hạ sĩ", "Trung sĩ", "Thượng sĩ"] },
  { label: "Cấp úy", ranks: ["Thiếu úy", "Trung úy", "Thượng úy", "Đại úy"] },
  { label: "Cấp tá", ranks: ["Thiếu tá", "Trung tá", "Thượng tá", "Đại tá"] },
  { label: "Cấp tướng", ranks: ["Thiếu tướng", "Trung tướng", "Thượng tướng", "Đại tướng", "Nguyên soái"] },
];

/** Every rank, lowest first; a rank's place in the URL is its index plus one. */
export const CF_RANKS: string[] = CF_RANK_GROUPS.flatMap((group) => group.ranks);

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
