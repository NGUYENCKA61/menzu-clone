import { describe, expect, it } from "vitest";

import { foldSearch, matchesSearch } from "@/lib/searchText";

/**
 * The follow list on /thong-bao is searched by people typing on a phone
 * keyboard with no accents on it, so what matters is that "valorant" finds
 * "Valorant", "hackpubg" finds "Hack PUBG", and an empty box still shows the
 * whole shelf.
 */
describe("foldSearch", () => {
  it("drops the accents", () => {
    expect(foldSearch("Sắp hết hàng")).toBe("saphethang");
    expect(foldSearch("Đang cập nhật")).toBe("dangcapnhat");
  });

  it("folds đ, which NFD leaves alone", () => {
    // đ is one codepoint, not d + a mark, so the accent pass never reaches it.
    expect(foldSearch("Đỏ")).toBe("do");
    expect(foldSearch("đường")).toBe("duong");
  });

  it("throws away spacing and punctuation so nobody has to guess it", () => {
    expect(foldSearch("Hack PUBG — Bản DESYNC!")).toBe("hackpubgbandesync");
  });

  it("keeps digits, which product names lean on", () => {
    expect(foldSearch("CS2 v1.5")).toBe("cs2v15");
  });
});

describe("matchesSearch", () => {
  const tool = ["Hack PUBG Bản DESYNC", "Hack PUBG"];

  it("shows everything before anything is typed", () => {
    expect(matchesSearch("", tool)).toBe(true);
    expect(matchesSearch("   ", tool)).toBe(true);
  });

  it("finds a name typed without its accents", () => {
    expect(matchesSearch("ban desync", tool)).toBe(true);
  });

  it("finds words that are not next to each other", () => {
    expect(matchesSearch("pubg desync", tool)).toBe(true);
  });

  it("matches on the category too, not only the name", () => {
    expect(matchesSearch("hack pubg", ["Valorant Tool Premium", "Hack PUBG"])).toBe(
      true,
    );
  });

  it("does not match when one word of several is absent", () => {
    expect(matchesSearch("pubg valorant", tool)).toBe(false);
  });

  it("ignores how the reader spaced it", () => {
    expect(matchesSearch("hackpubg", tool)).toBe(true);
    expect(matchesSearch("  hack   pubg  ", tool)).toBe(true);
  });

  it("treats a query of pure punctuation as nothing typed", () => {
    // "???" folds away to nothing, and a filter with no terms in it is not a
    // filter — showing the whole list beats showing an empty one.
    expect(matchesSearch("???", tool)).toBe(true);
  });
});
