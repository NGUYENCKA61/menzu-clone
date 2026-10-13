import { docHtmlIsEmpty, isHtmlBody } from "@/lib/docHtml";
import { parseRequirements } from "@/lib/productRequirements";

/**
 * Whether a tool's docs page (/tai-lieu/<slug>) has words of its own.
 *
 * A tool with no install guide and no requirements list prints the shop's
 * defaults, so its page is the same text as every other such page: of 29
 * tools, 10 differed from one another by nothing but the name (the owner's
 * SEO review, 13/10/2026). Those pages stay open to readers but are kept out
 * of the index and the sitemap, and come back on their own the day the shop
 * writes a guide or a list. The setup guide does not count: it is behind a
 * key, so a crawler never reads it.
 *
 * One predicate for both places, so the sitemap and the page's robots tag
 * cannot disagree. Takes the stored columns as they come from the database
 * (the sitemap) or as getToolDocs returns them (requirements parsed).
 */
export function hasOwnToolDoc(tool: {
  guide: string | null | undefined;
  requirements: string | readonly unknown[] | null | undefined;
}): boolean {
  const guide = tool.guide?.trim() ?? "";
  const ownGuide = guide !== "" && !(isHtmlBody(guide) && docHtmlIsEmpty(guide));
  const requirements = tool.requirements;
  const ownRequirements = Array.isArray(requirements)
    ? requirements.length > 0
    : typeof requirements === "string" && parseRequirements(requirements).length > 0;
  return ownGuide || ownRequirements;
}
