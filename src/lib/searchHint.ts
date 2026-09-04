/**
 * The example text in a category's tool search box.
 *
 * The captured shop's box said "HACK CS2 Bản Midnight, Valorant Tool
 * Premium" on every page, which on the Đột Kích page promised things that
 * were not there. The hint is built from the tools the page actually lists:
 * the game's name, then the editions the tools call themselves ("bản OBV",
 * "bản VS"), which is exactly what the box searches.
 *
 * Pure, so it can be tested with a list of names and nothing else.
 */

/**
 * Short all-caps words that are names, not words, and keep their case. A
 * four-letter run of capitals is otherwise read as an ordinary word (TRUY,
 * KÍCH), since the shop writes its category names in capitals throughout.
 */
const INITIALISMS = new Set([
  "CFVN",
  "CF4VN",
  "PUBG",
  "CODM",
  "HWID",
  "CSGO",
  "LMHT",
]);

/** Little words inside a name that read best in lowercase: Call of Duty. */
const MINOR_WORDS = new Set(["OF", "AND", "THE"]);

function isInitialism(word: string): boolean {
  return /^[A-Z0-9]{1,3}$/.test(word) || /^[A-Z]*\d[A-Z0-9]*$/.test(word) || INITIALISMS.has(word);
}

/** "HACK ĐỘT KÍCH CFVN - CF4VN" → "Đột Kích CFVN". */
export function shortGameName(categoryName: string): string {
  const core = categoryName
    .replace(/^\s*hack\s+/i, "")
    .split(/\s+[-–|(]|\s+mới\b/i)[0]
    .trim();
  return core
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((word) =>
      MINOR_WORDS.has(word)
        ? word.toLowerCase()
        : isInitialism(word)
          ? word
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

/**
 * Words that follow "bản" without naming an edition: "BẢN HACK FULL" is a
 * description, "BẢN OBV" is a name.
 */
const NOT_EDITIONS = new Set(["HACK", "FULL", "MỚI", "GIÁ", "RẺ", "NEW", "CHEAT", "TOOL"]);

/** The editions the tools name themselves by: "bản OBV" → "OBV", in order, unique. */
export function editionsOf(toolNames: (string | null)[]): string[] {
  const seen = new Set<string>();
  const editions: string[] = [];
  for (const name of toolNames) {
    const match = /\bb[ảẢ]n\s+([^\s,\-–!:()/]+)/i.exec(name ?? "");
    if (!match) continue;
    const edition = match[1];
    const key = edition.toUpperCase();
    if (edition.length > 12 || NOT_EDITIONS.has(key) || seen.has(key)) continue;
    seen.add(key);
    editions.push(edition);
  }
  return editions;
}

/**
 * "Tìm: HACK Đột Kích CFVN bản OBV, VS…". Without any edition in the
 * names, the first tool's own name stands in; with no tools at all, the game
 * alone.
 */
export function softwareSearchHint(categoryName: string, toolNames: (string | null)[]): string {
  const game = shortGameName(categoryName);
  const editions = editionsOf(toolNames).slice(0, 3);
  if (editions.length > 0) {
    return `Tìm: HACK ${game} bản ${editions.join(", ")}…`;
  }
  const first = toolNames.find((n): n is string => Boolean(n))?.trim();
  if (first) {
    const cut = first.length > 34 ? `${first.slice(0, 33).trimEnd()}…` : first;
    return `Tìm: ${cut}`;
  }
  return `Tìm HACK ${game}…`;
}
