import { describe, expect, it } from "vitest";

import {
  categoryHref,
  isReservedSlug,
  productHref,
  uniqueProductSlug,
} from "@/lib/routes";

/**
 * The shop is group → category → product, and only the last two are addresses.
 * These guard the two rules that keeps that true: a group never appears in a
 * URL, and one product has exactly one URL.
 */
describe("addresses", () => {
  it("puts the category at the root and the product under it", () => {
    expect(categoryHref("hack-pubg")).toBe("/hack-pubg");
    expect(productHref("hack-pubg", "hack-pubg-ban-desync")).toBe(
      "/hack-pubg/hack-pubg-ban-desync",
    );
  });

  it("never grows a third segment for the group", () => {
    // A category can stand on several home-page shelves. If a group ever
    // reached a URL, the same product would have one address per shelf and no
    // canonical among them.
    const href = productHref("hack-pubg", "hack-pubg-ban-desync");
    expect(href.split("/").filter(Boolean)).toHaveLength(2);
  });
});

describe("isReservedSlug", () => {
  it("knows the pages the site already serves at the root", () => {
    // A category slugged "cart" would be shadowed by the cart page forever:
    // Next.js answers the static segment first, so the category would be
    // unreachable at the only address it has.
    for (const taken of ["cart", "login", "admin", "docs", "orders", "api"]) {
      expect(isReservedSlug(taken)).toBe(true);
    }
  });

  it("does not object to an ordinary category name", () => {
    for (const free of ["hack-pubg", "hack-valorant", "tai-khoan-game"]) {
      expect(isReservedSlug(free)).toBe(false);
    }
  });

  it("matches whatever the case", () => {
    expect(isReservedSlug("LOGIN")).toBe(true);
  });
});

describe("uniqueProductSlug", () => {
  it("builds the address out of the product's name", () => {
    expect(uniqueProductSlug("Hack PUBG Bản DESYNC", "HACKPUBG01", [])).toBe(
      "hack-pubg-ban-desync",
    );
  });

  it("falls back to the code where there is no name", () => {
    // Accounts carry no name at all — the code is the only thing a customer
    // is ever shown for one.
    expect(uniqueProductSlug(null, "VLR2077", [])).toBe("vlr2077");
    expect(uniqueProductSlug("", "ĐÂS", [])).toBe("das");
  });

  it("counts up rather than colliding", () => {
    const taken = ["hack-cs2", "hack-cs2-2"];
    expect(uniqueProductSlug("Hack CS2", "X1", taken)).toBe("hack-cs2-3");
  });

  it("always answers with something usable", () => {
    // A name of pure punctuation and a code of pure punctuation would leave
    // nothing to slugify; the address still has to exist.
    expect(uniqueProductSlug("!!!", "???", [])).toBe("san-pham");
  });
});
