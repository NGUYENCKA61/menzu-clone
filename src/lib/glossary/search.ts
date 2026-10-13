/**
 * The glossary's search, kept pure so it can be tested and run in the browser
 * on every keystroke.
 *
 * Readers type without accents and without agreeing on spaces or hyphens
 * ("tam ngam" for "tâm ngắm", "anticheat" for "Anti-cheat"), so both sides are
 * folded first. A word's own name or one of its aliases beats a mention in
 * someone else's explanation, which is the order unnamedtech's plain
 * substring test did not have.
 */

import type { GlossaryTerm } from "./terms";

/**
 * Lowercase ASCII words: accents dropped, đ to d, and every run of anything
 * that is not a letter or digit one space. "Độ mượt" -> "do muot",
 * "VT-x" -> "vt x".
 */
export function foldText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The folded words run together, for "anticheat" against "anti cheat". */
function squash(folded: string): string {
  return folded.replace(/ /g, "");
}

/** One word, folded once, ready to be matched against many queries. */
export interface GlossaryIndexEntry {
  term: GlossaryTerm;
  /** The name and every alias, folded. */
  names: string[];
  /** The same, with the spaces taken out. */
  squashed: string[];
  /** Name, aliases, both explanations, tags and the group's label. */
  haystack: string;
}

export function buildGlossaryIndex(
  terms: readonly GlossaryTerm[],
  groupLabel: (group: GlossaryTerm["group"]) => string,
): GlossaryIndexEntry[] {
  return terms.map((term) => {
    const names = [term.term, ...(term.aliases ?? [])].map(foldText).filter(Boolean);
    const haystack = [
      term.term,
      ...(term.aliases ?? []),
      term.short,
      term.detail,
      ...(term.tags ?? []),
      groupLabel(term.group),
    ]
      .map(foldText)
      .join(" | ");
    return { term, names, squashed: names.map(squash), haystack };
  });
}

/**
 * How well one word answers a folded query, lower is better, null for no
 * match at all:
 *  0  its name or an alias is exactly the query,
 *  1  a name starts with it,
 *  2  a name contains it,
 *  3  its explanation contains it as typed,
 *  4  its explanation contains every word of it, in any order.
 */
export function rankEntry(entry: GlossaryIndexEntry, query: string): number | null {
  const q = foldText(query);
  if (!q) return null;
  const qs = squash(q);
  const { names, squashed, haystack } = entry;

  if (names.includes(q) || squashed.includes(qs)) return 0;
  if (names.some((n) => n.startsWith(q)) || squashed.some((n) => n.startsWith(qs))) return 1;
  if (names.some((n) => n.includes(q)) || squashed.some((n) => n.includes(qs))) return 2;
  if (haystack.includes(q)) return 3;
  if (q.split(" ").every((word) => haystack.includes(word))) return 4;
  return null;
}

/**
 * The words that answer a query, best first. Words of equal rank keep the
 * order of the file, so a search reads like the library it came from.
 */
export function searchGlossary(index: GlossaryIndexEntry[], query: string): GlossaryTerm[] {
  if (!foldText(query)) return [];
  return index
    .map((entry, order) => ({ entry, order, rank: rankEntry(entry, query) }))
    .filter((hit): hit is { entry: GlossaryIndexEntry; order: number; rank: number } => hit.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .map((hit) => hit.entry.term);
}
