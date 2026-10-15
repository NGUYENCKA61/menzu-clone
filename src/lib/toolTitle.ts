import { clampText } from "@/lib/accountSeo";

/**
 * A tool's name as a <title> and a docs title can carry it.
 *
 * The names are the owner's, typed for the shelf: "HACK ĐỘT KÍCH CFVN - BẢN
 * PRIME CHUYÊN ZOMBIE LOẠI 2 : TĂNG DAME … (NGỪNG HOẠT ĐỘNG)" runs 158
 * characters and HACK83's 148, so with " | Từ 39.000đ | THICHTHIHACK" the
 * tab and the search result carried 186 and 177 (the SEO review, round 2,
 * T1). The h1 keeps the typed name; only the title is tidied and cut.
 */

/** The most of the name a tool's <title> keeps, before " | Từ Xđ". */
export const TOOL_TITLE_MAX = 62;

/** The most of the name a tool's docs <title> keeps, before " | Tài liệu". */
export const DOCS_TITLE_MAX = 50;

/**
 * The name with the shelf's shouting taken off: runs of "!" go, the spaces
 * they leave inside brackets close up, whitespace folds to one space as HTML
 * draws it, and a " -" or ":" left dangling at the end comes off.
 */
export function tidyToolName(name: string): string {
  return name
    .replace(/!+/g, "")
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\(\)/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*[-:,|]+\s*$/, "")
    .trim();
}

/**
 * The <title> of a tool's page: the tidied name cut at a word to
 * TOOL_TITLE_MAX, then the price suffix the page passes ("Từ 39.000đ",
 * "Miễn phí", or none for a tool with no priced tier).
 */
export function toolPageTitle(name: string, suffix?: string | null): string {
  const short = clampTitle(name, TOOL_TITLE_MAX);
  return suffix ? `${short} | ${suffix}` : short;
}

/** The tidied name cut to `max`; a cut that lands after " -" or ":" closes
 *  up so the ellipsis follows a word. */
export function clampTitle(name: string, max: number): string {
  return clampText(tidyToolName(name), max).replace(/\s*[-:,(|]+\s*…$/, "…");
}
