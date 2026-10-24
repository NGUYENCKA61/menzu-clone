/**
 * An item's grade on the account page, as CrossFire's own inventory tints it
 * (the owner, 25/10/2026: "phân sao" → VIP gold, Hiếm purple, Thường plain,
 * "hợp lý", "làm đi"). VIP is the game's "V": the CrossFire wiki's VVIP,
 * Noble Gold and Prime categories, read 25/10/2026, boiled down to their
 * series names and characters below. Hiếm has no list; the shop marks it.
 *
 * The shop's own mark wins: an admin list line ending "(VIP)", "(Hiếm)" or
 * "(Thường)" is stored in the row's tier, VIP as ULTRA, Hiếm as PREMIUM and
 * Thường as SELECT (the Valorant tiers the column was made for, which read the
 * same way: ULTRA and EXCLUSIVE gold, PREMIUM purple, the rest plain).
 */
export type Grade = "VIP" | "Hiếm";

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
  if (item.tier === "PREMIUM") return "Hiếm";
  if (item.tier === "SELECT" || item.tier === "DELUXE") return null;
  return isVipName(item.name) ? "VIP" : null;
}

const MARK = /\s*\((vip|hiếm|hiem|thường|thuong)\)\s*$/iu;

/** A typed line's own mark, "(VIP)" / "(Hiếm)" / "(Thường)", split off as a tier. */
export function readGradeMark(line: string): { name: string; tier: "ULTRA" | "PREMIUM" | "SELECT" | null } {
  const match = MARK.exec(line);
  if (!match) return { name: line, tier: null };
  const mark = match[1]!.toLowerCase();
  const tier = mark === "vip" ? "ULTRA" : mark.startsWith("hi") ? "PREMIUM" : "SELECT";
  return { name: line.slice(0, match.index).trim(), tier };
}

/** The mark an admin list writes back after a name, "" for none. */
export function gradeMark(tier: string | null): string {
  if (tier === "ULTRA" || tier === "EXCLUSIVE") return " (VIP)";
  if (tier === "PREMIUM") return " (Hiếm)";
  if (tier === "SELECT" || tier === "DELUXE") return " (Thường)";
  return "";
}
