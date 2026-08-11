import { describe, expect, it } from "vitest";

import {
  CATEGORY_PRODUCTS,
  discountPct,
  formatVnd,
  productImage,
  type Product,
} from "@/components/sites/menzu-lol-f7ae197a/shared/productData";

describe("formatVnd", () => {
  it("groups thousands with dots, the Vietnamese convention", () => {
    expect(formatVnd(1000)).toBe("1.000");
    expect(formatVnd(2990000)).toBe("2.990.000");
    expect(formatVnd(17200000)).toBe("17.200.000");
  });

  it("leaves values below 1000 alone", () => {
    expect(formatVnd(0)).toBe("0");
    expect(formatVnd(999)).toBe("999");
  });

  it("does not put a separator before the first digit", () => {
    expect(formatVnd(100000)).not.toMatch(/^\./);
  });
});

describe("discountPct", () => {
  const make = (oldPrice: number, price: number): Product => ({
    code: "TEST",
    rank: "Unranked",
    skins: 0,
    tiers: [],
    tag: null,
    extraSkins: 0,
    oldPrice,
    price,
  });

  it("matches the percentages read off the live site", () => {
    // VLR2030 showed -38% for 4.800.000 -> 2.990.000.
    expect(discountPct(make(4_800_000, 2_990_000))).toBe(38);
    // VLR2136 showed -60% for 17.200.000 -> 6.880.000.
    expect(discountPct(make(17_200_000, 6_880_000))).toBe(60);
  });

  it("is 0 when nothing is discounted", () => {
    expect(discountPct(make(850_000, 850_000))).toBe(0);
  });

  it("never exceeds 100", () => {
    expect(discountPct(make(1_000_000, 0))).toBeLessThanOrEqual(100);
  });
});

describe("seeded catalogue data", () => {
  it("never sells above the original price", () => {
    for (const p of CATEGORY_PRODUCTS) {
      expect(p.price).toBeLessThanOrEqual(p.oldPrice);
    }
  });

  it("uses whole VND, never fractions", () => {
    for (const p of CATEGORY_PRODUCTS) {
      expect(Number.isInteger(p.price)).toBe(true);
      expect(Number.isInteger(p.oldPrice)).toBe(true);
    }
  });

  it("has a unique code per product", () => {
    const codes = CATEGORY_PRODUCTS.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("counts tiers consistently with the headline skin count", () => {
    // The card's headline counts weapon skins; the tier counters break the
    // same set down, so they must not exceed it.
    for (const p of CATEGORY_PRODUCTS) {
      const tierTotal = p.tiers.reduce((sum, t) => sum + t.count, 0);
      expect(tierTotal).toBeLessThanOrEqual(p.skins);
    }
  });

  it("builds image paths under the site's own asset namespace", () => {
    expect(productImage("VLR2030")).toBe(
      "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/account/VLR2030.webp",
    );
  });
});
