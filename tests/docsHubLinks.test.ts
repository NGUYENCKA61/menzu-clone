import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  DocsHelpCenter,
  DocsSearchProvider,
  type DocCard,
} from "@/components/sites/menzu-lol-f7ae197a/shared/DocsHelpCenter";
import { ARTICLE_SHELVES, type DocShelf } from "@/lib/docCategories";

/**
 * The /docs hub opens on the FAQ shelf, and its shelves and pager are
 * buttons. A crawler sees only the server HTML, so every published article
 * must be linked there all the same (the owner's SEO review, 13/10/2026:
 * several articles had no inbound link at all).
 */
function card(slug: string, category: DocShelf, featured = false): DocCard {
  return {
    slug,
    title: `Bài ${slug}`,
    category,
    excerpt: "",
    thumbnailUrl: "/images/docs/covers/x.webp",
    views: 0,
    publishedAt: "2026-10-01T00:00:00.000Z",
    featured,
  };
}

function serverHtml(articles: DocCard[]) {
  return renderToString(
    createElement(
      DocsSearchProvider,
      null,
      createElement(DocsHelpCenter, { articles, faq: [{ q: "Hỏi?", a: "Đáp." }] }),
    ),
  );
}

describe("DocsHelpCenter server HTML", () => {
  // More than one page (6 cards) on a shelf, so the pager's later pages
  // are covered too.
  const articles = ARTICLE_SHELVES.flatMap((shelf, s) =>
    Array.from({ length: s === 0 ? 14 : 3 }, (_, i) => card(`${shelf.toLowerCase()}-${i}`, shelf, i === 0)),
  );

  it("links every article, whatever shelf and page it sits on", () => {
    const html = serverHtml(articles);
    const linked = new Set(Array.from(html.matchAll(/href="\/docs\/([^"]+)"/g), (m) => m[1]));
    for (const article of articles) expect(linked, article.slug).toContain(article.slug);
  });

  it("keeps the cards that are not on screen hidden", () => {
    const html = serverHtml(articles);
    // The FAQ shelf is open, so every article card sits in the hidden list.
    const hiddenAt = html.indexOf("<div hidden");
    expect(hiddenAt).toBeGreaterThan(-1);
    const hiddenBlock = html.slice(hiddenAt, html.indexOf("<h2", hiddenAt));
    for (const article of articles) expect(hiddenBlock).toContain(`href="/docs/${article.slug}"`);
  });
});
