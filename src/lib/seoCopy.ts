import categoriesJson from "../../content/seo/categories.json";
import toolsJson from "../../content/seo/tools.json";

/**
 * SEO copy that ships in git rather than in the owner's catalogue rows
 * (round 2 of the SEO review; the owner, 15/10/2026: "Làm seo đi").
 *
 * content/seo/categories.json holds, by Category.slug, a category page's
 * meta title, meta description, intro and FAQ; content/seo/tools.json holds,
 * by Product.slug, a tool's short description. A page reads its entry when
 * there is one and renders exactly as before when there is none, so the
 * owner can move a piece of copy into the admin fields later and the file
 * simply stops being read for that slug.
 *
 * Both files are parsed once, here, at module load. A bad entry therefore
 * fails `npm run test` (tests/seoCopy.test.ts parses the real files) and the
 * first render in dev, instead of reaching a search result quietly.
 */

export interface FaqItem {
  q: string;
  a: string;
}

export interface CategorySeoCopy {
  /** The <title> before the layout's " | THICHTHIHACK". */
  metaTitle: string;
  metaDescription: string;
  /** Two or three <p>, holding only strong, em and root-relative links. */
  intro: string;
  faq: FaqItem[];
}

export interface ToolSeoCopy {
  /** Stands in for an empty "Mô tả ngắn": the line under the title, the
   *  card's two lines, the meta description and the Product markup. */
  summary: string;
}

export const CATEGORIES_FILE = "content/seo/categories.json";
export const TOOLS_FILE = "content/seo/tools.json";

/** Names the file, the slug and the field, so the fix is one search away. */
export class SeoCopyError extends Error {
  constructor(file: string, slug: string, field: string, reason: string) {
    super(`${file}: ${slug}.${field} ${reason}`);
    this.name = "SeoCopyError";
  }
}

/** A key is a Category.slug or a Product.slug. */
const SLUG = /^[a-z0-9-]+$/;

/**
 * The intro's whole grammar, and its sanitizer: it is rendered with
 * dangerouslySetInnerHTML, so nothing outside this pattern may pass. Two or
 * three paragraphs; inside them text, strong, em and anchors whose href
 * starts with one "/" (a second would make it protocol-relative, which is
 * another site). No attribute but that href, so no target, no onclick.
 */
export const INTRO_ALLOWED =
  /^(?:\s*<p>(?:[^<]|<\/?(?:strong|em)>|<a href="\/(?!\/)[^"]*">|<\/a>)+<\/p>\s*){2,3}$/;

/**
 * What no public sentence may say (the round-2 style guide): dashes, any
 * promise about bans or detection, "100%", "undetected", round-the-clock
 * support. `\b` knows ASCII letters only, so the word edges are written out
 * for Vietnamese: "khoá" ends in a letter `\b` does not see.
 */
export const STYLE_FORBIDDEN: readonly RegExp[] = [
  /[–—]/,
  /(?<![\p{L}\p{N}])(?:không|ko)\s+bị\s+(?:ban|kho[aá]|khóa|phát hiện)(?![\p{L}\p{N}])/iu,
  /100\s*%/,
  /an toàn tuyệt đối|undetect(?:ed|able)?|bất tử|không thể bị/iu,
  /(?<![\p{L}\p{N}])hỗ trợ 24\/7(?![\p{L}\p{N}])/iu,
];

/** The first forbidden pattern a string trips, or null. */
export function styleViolation(text: string): RegExp | null {
  return STYLE_FORBIDDEN.find((re) => re.test(text)) ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A trimmed string of `min`..`max` characters that says nothing forbidden. */
function readText(
  file: string,
  slug: string,
  field: string,
  value: unknown,
  min: number,
  max: number,
): string {
  if (typeof value !== "string") {
    throw new SeoCopyError(file, slug, field, "must be a string");
  }
  if (value !== value.trim()) {
    throw new SeoCopyError(file, slug, field, "has leading or trailing whitespace");
  }
  if (value.length < min || value.length > max) {
    throw new SeoCopyError(
      file,
      slug,
      field,
      `must be ${min}..${max} characters, is ${value.length}`,
    );
  }
  const tripped = styleViolation(value);
  if (tripped) {
    throw new SeoCopyError(file, slug, field, `says something forbidden (${tripped.source})`);
  }
  return value;
}

/** As readText, and no markup: the answers print as text in the accordion. */
function readPlainText(
  file: string,
  slug: string,
  field: string,
  value: unknown,
  min: number,
  max: number,
): string {
  const text = readText(file, slug, field, value, min, max);
  if (text.includes("<")) {
    throw new SeoCopyError(file, slug, field, "must be plain text, no markup");
  }
  return text;
}

function entries(file: string, raw: unknown): [string, Record<string, unknown>][] {
  if (!isRecord(raw)) {
    throw new SeoCopyError(file, "*", "root", "must be an object keyed by slug");
  }
  return Object.entries(raw).map(([slug, entry]) => {
    if (!SLUG.test(slug)) {
      throw new SeoCopyError(file, slug, "key", "must be a slug: a-z, 0-9 and dashes");
    }
    if (!isRecord(entry)) {
      throw new SeoCopyError(file, slug, "entry", "must be an object");
    }
    return [slug, entry];
  });
}

function readFaq(file: string, slug: string, value: unknown): FaqItem[] {
  if (!Array.isArray(value) || value.length < 3 || value.length > 6) {
    throw new SeoCopyError(file, slug, "faq", "must be a list of 3..6 questions");
  }
  return value.map((item, index) => {
    const field = `faq[${index}]`;
    if (!isRecord(item)) {
      throw new SeoCopyError(file, slug, field, "must be an object with q and a");
    }
    const q = readPlainText(file, slug, `${field}.q`, item.q, 10, 120);
    if (!q.endsWith("?")) {
      throw new SeoCopyError(file, slug, `${field}.q`, 'must end in "?"');
    }
    const a = readPlainText(file, slug, `${field}.a`, item.a, 40, 600);
    return { q, a };
  });
}

export function parseCategorySeoCopy(
  raw: unknown,
  file = CATEGORIES_FILE,
): Map<string, CategorySeoCopy> {
  const out = new Map<string, CategorySeoCopy>();
  for (const [slug, entry] of entries(file, raw)) {
    // The layout appends " | THICHTHIHACK" itself, so a title that carries
    // the brand or a bar of its own would print both twice.
    const metaTitle = readText(file, slug, "metaTitle", entry.metaTitle, 20, 48);
    if (metaTitle.includes("|") || /THICHTHIHACK/i.test(metaTitle)) {
      throw new SeoCopyError(
        file,
        slug,
        "metaTitle",
        'must not carry "|" or the brand: the layout adds " | THICHTHIHACK"',
      );
    }
    const metaDescription = readText(
      file,
      slug,
      "metaDescription",
      entry.metaDescription,
      80,
      160,
    );
    const intro = readText(file, slug, "intro", entry.intro, 1, 6000);
    if (!INTRO_ALLOWED.test(intro)) {
      throw new SeoCopyError(
        file,
        slug,
        "intro",
        "must be 2 or 3 <p> holding only text, strong, em and root-relative links",
      );
    }
    out.set(slug, {
      metaTitle,
      metaDescription,
      intro,
      faq: readFaq(file, slug, entry.faq),
    });
  }
  return out;
}

export function parseToolSeoCopy(raw: unknown, file = TOOLS_FILE): Map<string, ToolSeoCopy> {
  const out = new Map<string, ToolSeoCopy>();
  for (const [slug, entry] of entries(file, raw)) {
    out.set(slug, {
      summary: readPlainText(file, slug, "summary", entry.summary, 60, 160),
    });
  }
  return out;
}

// Parsed once, at load: see the note at the top.
const CATEGORY_COPY = parseCategorySeoCopy(categoriesJson);
const TOOL_COPY = parseToolSeoCopy(toolsJson);

/** The written copy for a category page, or null when the file has none. */
export function categorySeoCopy(slug: string): CategorySeoCopy | null {
  return CATEGORY_COPY.get(slug) ?? null;
}

/** The written short description for a tool, or null when the file has none. */
export function toolSeoCopy(slug: string): ToolSeoCopy | null {
  return TOOL_COPY.get(slug) ?? null;
}

/** The FAQ in the shape FaqAccordion draws. */
export function faqEntries(copy: CategorySeoCopy): { question: string; answer: string }[] {
  return copy.faq.map((item) => ({ question: item.q, answer: item.a }));
}
