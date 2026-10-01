/**
 * The wiki's shelves, in the order /docs lays them out (the owner,
 * 01/10/2026: "FAQ, Khái niệm và thuật ngữ, Hướng dẫn, Chính sách, Các điều
 * khoản chung"). One list for the public page, the home section, the footer
 * and the admin, so a shelf added or renamed is added or renamed everywhere.
 *
 * FAQ is a shelf on the page but holds no articles: its questions are the
 * shop's own (Cấu hình → FAQ). WARRANTY keeps its stored name and reads
 * "Chính sách" — the footer's /docs#WARRANTY links still land on it.
 */

export const DOC_SHELVES = ["FAQ", "GLOSSARY", "GUIDE", "WARRANTY", "TERMS"] as const;
export type DocShelf = (typeof DOC_SHELVES)[number];

/** The shelves an article can be filed on. */
export const ARTICLE_SHELVES = ["GLOSSARY", "GUIDE", "WARRANTY", "TERMS"] as const;
export type ArticleShelf = (typeof ARTICLE_SHELVES)[number];

export const DOC_SHELF_LABEL: Record<DocShelf, string> = {
  FAQ: "FAQ",
  GLOSSARY: "Khái niệm và thuật ngữ",
  GUIDE: "Hướng dẫn",
  WARRANTY: "Chính sách",
  TERMS: "Các điều khoản chung",
};

export function isDocShelf(value: string): value is DocShelf {
  return (DOC_SHELVES as readonly string[]).includes(value);
}

export function isArticleShelf(value: string): value is ArticleShelf {
  return (ARTICLE_SHELVES as readonly string[]).includes(value);
}
