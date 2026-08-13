/**
 * "Valorant Random" -> "valorant-random". A slug is a public URL segment, so
 * it is derived rather than typed: a stray space or capital there is a broken
 * link, not a cosmetic slip.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    // Vietnamese text carries combining marks; strip them so "Tài Khoản"
    // becomes "tai-khoan" rather than percent-escapes in the URL bar. Matched
    // by Unicode property rather than a literal range — a raw block of
    // combining characters in source is invisible and does not survive edits.
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
