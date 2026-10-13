import path from "node:path";

/**
 * The default share picture: the hero banner cropped to the size Open Graph
 * cards are drawn at, served by app/share-card.jpg/route.ts.
 *
 * Pages with no picture of their own shared the banner itself, a 5120x2851
 * JPEG of about 4.8 MB declared as 1200x630: the wrong shape, the wrong
 * size, and close to X's 5 MB limit, heavy enough for Zalo and Facebook to
 * give up fetching it (the owner's SEO review, 13/10/2026).
 */
export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 630;
export const SHARE_CARD_PATH = "/share-card.jpg";

/**
 * A short tag that changes when the banner does (FNV-1a over its address).
 * Facebook, Zalo and Telegram keep a card's picture by its URL for days, so
 * the URL has to change for a new banner to reach them; uploads are named
 * with random bytes, so a new banner is always a new address.
 */
export function shareCardVersion(source: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/** The card picture's address for this banner. */
export function shareCardHref(heroBanner: string): string {
  return `${SHARE_CARD_PATH}?v=${shareCardVersion(heroBanner.trim())}`;
}

/**
 * The file under public/ that a site path such as /uploads/site/x.jpg names,
 * or null when it is not a plain path inside that folder (an absolute URL, a
 * protocol-relative one, a dot segment, a backslash). Read from disk rather
 * than over HTTP: the server would otherwise fetch itself through the public
 * domain for a file it already has.
 */
export function publicFilePath(src: string, publicDir: string): string | null {
  if (!src.startsWith("/") || src.startsWith("//")) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(src.split(/[?#]/)[0] ?? "");
  } catch {
    return null;
  }
  const parts = decoded.split("/").filter(Boolean);
  if (
    parts.length === 0 ||
    parts.some((part) => part.startsWith(".") || /[\\:\0]/.test(part))
  ) {
    return null;
  }
  const root = path.resolve(publicDir);
  const file = path.join(root, ...parts);
  return file.startsWith(root + path.sep) ? file : null;
}
