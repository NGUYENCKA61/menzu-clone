/**
 * "Tính năng nổi bật" — the bullet list on a tool's page, per product.
 *
 * Stored as a JSON string in one column rather than as a child table: these
 * are written and read as a block, never counted, never joined, and never
 * queried one at a time — unlike a product's packages, which orders point at,
 * or its skins, which the card counts by tier.
 *
 * A product that has not been given its own list falls back to DEFAULT_FEATURES
 * below, which is what every tool printed when this was a constant in the
 * component. Nothing on the storefront goes blank because a shop has not got
 * round to a product yet.
 */

import {
  docHtmlIsEmpty,
  isHtmlBody,
  plainToDocHtml,
  sanitizeDocHtml,
} from "@/lib/docHtml";

export interface ProductFeature {
  title: string;
  body: string;
}

/** What every tool said before the list could be edited. */
export const DEFAULT_FEATURES: readonly ProductFeature[] = [
  {
    title: "Giao diện dễ sử dụng",
    body: "thiết kế trực quan, thao tác nhanh và dễ làm quen.",
  },
  {
    title: "Cập nhật thường xuyên",
    body: "phiên bản được cập nhật để tương thích với các thay đổi mới.",
  },
  {
    title: "Nhiều tùy chọn",
    body: "lựa chọn các tính năng phù hợp với gói đã mua.",
  },
  {
    title: "Ổn định",
    body: "tối ưu hiệu suất để mang lại trải nghiệm mượt mà.",
  },
];

/** Past this the list stops being "nổi bật" and becomes a manual. */
export const FEATURE_MAX = 12;
export const FEATURE_TITLE_MAX = 60;
export const FEATURE_BODY_MAX = 200;

/**
 * One bullet, or null if it is not one.
 *
 * The title carries the line — it is what is set in bold and what a skimming
 * reader actually reads — so a row without one is dropped. The body may be
 * empty: "Aimbot" on its own is a feature.
 */
export function toFeature(value: unknown): ProductFeature | null {
  const row = value as { title?: unknown; body?: unknown } | null;
  const title = String(row?.title ?? "").trim();
  if (!title) return null;
  return {
    title: title.slice(0, FEATURE_TITLE_MAX),
    body: String(row?.body ?? "").trim().slice(0, FEATURE_BODY_MAX),
  };
}

/** Cleans a list on its way into the database. */
export function sanitizeFeatures(value: unknown): ProductFeature[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(toFeature)
    .filter((f): f is ProductFeature => f !== null)
    .slice(0, FEATURE_MAX);
}

/**
 * Reads the stored column. Anything unparseable reads as "not set", which the
 * caller turns into the defaults — a corrupt row must not blank a live page.
 */
export function parseFeatures(raw: string | null | undefined): ProductFeature[] {
  if (!raw) return [];
  try {
    return sanitizeFeatures(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function serializeFeatures(features: ProductFeature[]): string | null {
  const clean = sanitizeFeatures(features);
  // Null rather than "[]": an empty list means the product has none of its own,
  // which is exactly what an unset column already says.
  return clean.length > 0 ? JSON.stringify(clean) : null;
}

/** What the page draws: the product's own list, or the shop's default one. */
export function featuresOrDefault(features: ProductFeature[]): readonly ProductFeature[] {
  return features.length > 0 ? features : DEFAULT_FEATURES;
}

/**
 * One feature per line, "Tên: mô tả" — the shape the desk types in.
 *
 * A line is split at its FIRST colon, so a description may contain as many
 * more as it likes ("ESP: tường, tên, máu: đầy đủ"). A line with no colon is
 * all name, which is a feature too: "No recoil" needs no sentence after it.
 *
 * Typed as text rather than collected from a pair of boxes per row because
 * that is how a list of eight arrives — pasted or typed straight through,
 * without pressing "add" eight times.
 */
export function parseFeatureLines(text: string): ProductFeature[] {
  return sanitizeFeatures(
    text.split(/\r?\n/).map((line) => {
      const at = line.indexOf(":");
      return at === -1
        ? { title: line, body: "" }
        : { title: line.slice(0, at), body: line.slice(at + 1) };
    }),
  );
}

/** The same list back as text, for the box to open with. */
export function featuresToLines(features: ProductFeature[]): string {
  return features
    .map((f) => (f.body ? `${f.title}: ${f.body}` : f.title))
    .join("\n");
}

/**
 * The write-up under the list.
 *
 * Caged by the same allowlist as an article body and a product description —
 * a tag that cannot appear in one of them cannot appear here. An empty
 * document stores as null rather than as `<p></p>`, because an editor left
 * untouched still sends markup and the page must not draw a blank block on
 * the strength of it.
 */
export function cleanFeaturesNote(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (!isHtmlBody(value)) return value;
  const clean = sanitizeDocHtml(value);
  return docHtmlIsEmpty(clean) ? null : clean;
}

/** The stored note as the editor wants it: HTML, with legacy text lifted. */
export function noteToEditorHtml(stored: string | null | undefined): string {
  if (!stored) return "";
  return isHtmlBody(stored) ? stored : plainToDocHtml(stored);
}
