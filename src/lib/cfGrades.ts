/**
 * An item's grade on the account page, tinted the way CrossFire's own
 * inventory tints its tiles (the owner, 25/10/2026: "phân sao", "làm đi"):
 * gold with a "V" for VIP, purple for PvE (AI mode) weapons ("ô tím hình như
 * là súng AI", then "thay chữ AI thành PVE"; their corner icon is the
 * inventory's AI(PvE) tab icon), blue for
 * Nano ones (their corner icon is the Nano tab's), plain for the rest.
 *
 * VIP is also worked out from the name: the CrossFire wiki's VVIP, Noble Gold
 * and Prime categories, read 25/10/2026, boiled down to their series names
 * and characters below. PVE and Nano have no list; the shop marks them.
 *
 * The shop's own mark wins: an admin list line ending "(VIP)", "(PVE)" (or
 * the earlier "(AI)"), "(Nano)" or "(Thường)" is stored in the row's tier, as ULTRA, PREMIUM,
 * DELUXE and SELECT (the Valorant tiers the column was made for). Only rows
 * the shop typed (no icon of their own) are graded: a scraped Valorant row's
 * tier means something else.
 */
export type Grade = "VIP" | "PVE" | "Nano";

/** A weapon whose name holds one of these series is VIP ("M4A1-S Born Beast"). */
const VIP_SERIES = [
  "beast", "transformers", "iron spider", "iron shark", "iron wolf", "wild eagle", "spaceship",
  "steel empire", "asgard", "general fire", "victor dragon", "red frame hawk", "black panther",
  "hyper plasma", "hyper tech", "infernal dragon", "dominator", "jewelry", "reactive armour",
  "vermilion bird", "cloud dragon", "el dorado", "g spirit", "satellite", "sky god", "azure dragon",
  "dragon aspect", "predator", "black tortoise", "white tiger", "luminous edge", "apex fang",
  "nova lance", "specular", "gold empire", "stardust", "gun knife", "gunknife", "noble gold",
];

/** VVIP characters, matched on the whole name or its start ("Subject Alpha-Veteran"). */
const VIP_CHARACTERS = [
  "baron woman", "blitz buster", "bomb lunatic", "bulls eye", "dx heroine", "desperado",
  "devil hunter merc", "dragon force", "dragonian", "esports yun", "girl crush", "guan xiaoyu",
  "gunslinger", "heirs", "hong er", "lan xier", "machina", "nymphs", "orchid-warrior", "qingya",
  "runaways", "sentry shaman", "seraph", "serpent exorcist", "sicarios", "sisterhood",
  "star raiders", "subject alpha", "switcher", "team ace player", "the fates", "ultimatum",
  "undercurrent morgana", "verdandi", "wild west", "wu mengmeng", "xiao qiao", "yumo",
];

const words = (name: string) => ` ${name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;

/** The wiki's VIP, worked out from the name alone. */
export function isVipName(name: string): boolean {
  const text = words(name);
  if (VIP_SERIES.some((series) => text.includes(` ${series} `))) return true;
  const lower = name.trim().toLowerCase();
  return VIP_CHARACTERS.some((c) => lower === c || lower.startsWith(`${c}-`) || lower.startsWith(`${c} `));
}

/** An item's grade: the shop's mark in `tier` first, else the name. */
export function gradeOf(item: { name: string; tier: string | null }): Grade | null {
  if (item.tier === "ULTRA" || item.tier === "EXCLUSIVE") return "VIP";
  if (item.tier === "PREMIUM") return "PVE";
  if (item.tier === "DELUXE") return "Nano";
  if (item.tier === "SELECT") return null;
  return isVipName(item.name) ? "VIP" : null;
}

/** The kinds the game's PREMIUM tab holds: weapons and the character pieces. */
export const PREMIUM_KINDS = ["WEAPON_SKIN", "AGENT", "COSTUME", "ACCESSORY"];

/**
 * VIP Ingame: the account's VIP items, the count the game prints under its
 * PREMIUM tab and the site's Premium tab shows (the owner, 25/10/2026: "vip
 * ingame dựa vào tổng số premium"). A row with a picture of its own is
 * scraped Valorant data and has no grade, as on the account page. An account
 * with no weapons or character pieces listed keeps the number the shop typed.
 */
export function vipIngameOf(
  typed: number,
  items: { kind: string; name: string; tier: string | null; iconUrl: string | null }[],
): number {
  const listed = items.filter((item) => PREMIUM_KINDS.includes(item.kind));
  if (listed.length === 0) return typed;
  return listed.filter((item) => !item.iconUrl && gradeOf(item) === "VIP").length;
}

export type GradeTier = "ULTRA" | "PREMIUM" | "DELUXE" | "SELECT";

const MARK =/\s*\((vip|pve|ai|nano|thường|thuong)\)\s*$/iu;
const TIER_OF_MARK: Record<string, GradeTier> = {
  vip: "ULTRA",
  pve: "PREMIUM",
  ai: "PREMIUM",
  nano: "DELUXE",
  "thường": "SELECT",
  thuong: "SELECT",
};

/** A typed line's own mark, "(VIP)" / "(PVE)" / "(Nano)" / "(Thường)", split off as a tier. */
export function readGradeMark(line: string): { name: string; tier: GradeTier | null } {
  const match = MARK.exec(line);
  if (!match) return { name: line, tier: null };
  return { name: line.slice(0, match.index).trim(), tier: TIER_OF_MARK[match[1]!.toLowerCase()]! };
}

/** The mark an admin list writes back after a name, "" for none. */
export function gradeMark(tier: string | null): string {
  if (tier === "ULTRA" || tier === "EXCLUSIVE") return " (VIP)";
  if (tier === "PREMIUM") return " (PVE)";
  if (tier === "DELUXE") return " (Nano)";
  if (tier === "SELECT") return " (Thường)";
  return "";
}
