import { beforeEach, describe, expect, it, vi } from "vitest";

import { PC_SETUP_PAGES } from "@/lib/pcSetup";

/**
 * The sitemap's lastmod must move with a page's content, not with sales
 * (the owner's SEO review, 13/10/2026). Every sale bumps a product's
 * updatedAt through soldCount, so the catalogue below is "sold from" between
 * two reads by moving every product's updatedAt.
 */
const catalogue = vi.hoisted(() => ({ productsUpdatedAt: new Date("2026-10-01T00:00:00Z") }));

vi.mock("@/lib/queries", () => ({ LISTED_PRODUCT: {} }));
vi.mock("@/lib/db", () => ({
  db: {
    product: {
      findMany: async () => [
        {
          slug: "hack-valorant",
          productType: "SOFTWARE_GAME",
          accountPool: false,
          updatedAt: catalogue.productsUpdatedAt,
          category: { slug: "hack-valorant-moi" },
        },
        {
          slug: "acc-vlr-1",
          productType: "ACCOUNT_GAME",
          accountPool: false,
          updatedAt: catalogue.productsUpdatedAt,
          category: { slug: "acc-valorant" },
        },
        {
          slug: "acc-random",
          productType: "ACCOUNT_GAME",
          accountPool: true,
          updatedAt: catalogue.productsUpdatedAt,
          category: { slug: "acc-valorant" },
        },
      ],
    },
    category: {
      findMany: async () => [
        { slug: "hack-valorant-moi", updatedAt: new Date("2026-09-20T00:00:00Z") },
      ],
    },
    docArticle: {
      findMany: async () => [
        { slug: "spoofer-la-gi", updatedAt: new Date("2026-10-05T00:00:00Z") },
        // The old glossary article: its row stays, its address redirects.
        { slug: "thuat-ngu-chuc-nang-hack", updatedAt: new Date("2026-10-13T00:00:00Z") },
      ],
    },
  },
}));

const { default: sitemap } = await import("@/app/sitemap");

/** lastmod by path, the origin stripped. */
async function lastmods(): Promise<Map<string, string | Date | undefined>> {
  const entries = await sitemap();
  return new Map(entries.map((entry) => [new URL(entry.url).pathname, entry.lastModified]));
}

beforeEach(() => {
  catalogue.productsUpdatedAt = new Date("2026-10-01T00:00:00Z");
});

describe("sitemap lastmod", () => {
  it("does not move the static and PC-setup pages when something sells", async () => {
    const before = await lastmods();
    catalogue.productsUpdatedAt = new Date("2026-10-13T09:30:00Z");
    const after = await lastmods();

    for (const path of ["/", "/bio", "/categories", ...PC_SETUP_PAGES.map((p) => `/tai-lieu/chuan-bi/${p.slug}`)]) {
      expect(before.get(path), path).toBeDefined();
      expect(after.get(path), path).toEqual(before.get(path));
    }
  });

  it("sends no lastmod for tools, their docs pages, listings, or categories", async () => {
    const map = await lastmods();
    expect(map.has("/hack-valorant-moi/hack-valorant")).toBe(true);
    expect(map.get("/hack-valorant-moi/hack-valorant")).toBeUndefined();
    expect(map.get("/tai-lieu/hack-valorant")).toBeUndefined();
    expect(map.get("/acc-valorant/acc-random")).toBeUndefined();
    // A bulk admin edit stamps every shelf the same minute; eight identical
    // dates read as noise, so categories carry none (SEO review 28/10).
    expect(map.has("/hack-valorant-moi")).toBe(true);
    expect(map.get("/hack-valorant-moi")).toBeUndefined();
  });

  it("keeps the real dates: a one-off account, a wiki article", async () => {
    const map = await lastmods();
    expect(map.get("/acc-valorant/acc-vlr-1")).toEqual(new Date("2026-10-01T00:00:00Z"));
    expect(map.get("/docs/spoofer-la-gi")).toEqual(new Date("2026-10-05T00:00:00Z"));
  });

  it("lists the glossary page, not the article address that redirects to it", async () => {
    const map = await lastmods();
    expect(map.get("/docs/thuat-ngu")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(map.has("/docs/thuat-ngu-chuc-nang-hack")).toBe(false);
  });

  it("writes every hand-kept date as a calendar day", async () => {
    const map = await lastmods();
    for (const [path, value] of map) {
      if (typeof value === "string") expect(value, path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
