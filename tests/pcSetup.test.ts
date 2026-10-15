import { describe, expect, it } from "vitest";

import { PC_SETUP_PAGES, pcSetupHref, pcSetupPage } from "@/lib/pcSetup";

/**
 * The seven "Chuẩn bị máy" pages: each `short` is the page's meta
 * description as well as its checklist line, so it has to be one whole
 * sentence of snippet length (the SEO review, round 2, T12), and the notes'
 * links have to stay on the shop.
 */
describe("PC_SETUP_PAGES", () => {
  it("has seven pages with distinct slugs", () => {
    expect(PC_SETUP_PAGES).toHaveLength(7);
    expect(new Set(PC_SETUP_PAGES.map((p) => p.slug)).size).toBe(7);
  });

  it("describes each page in one sentence of 70 to 150 characters", () => {
    for (const page of PC_SETUP_PAGES) {
      expect(page.short.length, page.slug).toBeGreaterThanOrEqual(70);
      expect(page.short.length, page.slug).toBeLessThanOrEqual(150);
      expect(page.short, page.slug).toMatch(/\.$/);
      expect(page.short, page.slug).not.toMatch(/[–—]/);
    }
  });

  it("links the reset-HWID notes to the two spoofer shelves, root-relative", () => {
    const page = pcSetupPage("reset-hwid");
    expect(page?.links?.map((l) => l.href)).toEqual(["/hack-valorant-moi", "/hack-delta-force-moi"]);
    for (const p of PC_SETUP_PAGES) {
      for (const link of p.links ?? []) expect(link.href, p.slug).toMatch(/^\/[a-z0-9-]+/);
    }
  });

  it("addresses a page under /tai-lieu/chuan-bi", () => {
    expect(pcSetupHref("tat-tpm")).toBe("/tai-lieu/chuan-bi/tat-tpm");
    expect(pcSetupPage("khong-co")).toBeNull();
  });
});
