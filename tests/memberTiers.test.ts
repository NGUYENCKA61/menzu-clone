import { describe, expect, it } from "vitest";

import {
  formatTierPercent,
  MEMBER_TIERS,
  nextTier,
  readMemberTier,
  TIER_RULES,
  tierDiscountFor,
  tierForTopUp,
  tierProgress,
  tierRank,
} from "@/lib/memberTiers";

describe("tierForTopUp", () => {
  it("earns each tier exactly at its threshold", () => {
    for (const tier of MEMBER_TIERS) {
      expect(tierForTopUp(TIER_RULES[tier].minTopUp)).toBe(tier);
      if (tier !== "CLASSIC") {
        expect(tierForTopUp(TIER_RULES[tier].minTopUp - 1)).not.toBe(tier);
      }
    }
  });

  it("never goes above Elite and never below Classic", () => {
    expect(tierForTopUp(10 ** 12)).toBe("ELITE");
    expect(tierForTopUp(0)).toBe("CLASSIC");
    expect(tierForTopUp(-5)).toBe("CLASSIC");
  });
});

describe("tierProgress", () => {
  it("measures the climb between the current tier and the next", () => {
    // Halfway from Classic (0) to Gold (2tr).
    const p = tierProgress(750_000, "CLASSIC");
    expect(p.next).toBe("GOLD");
    expect(p.remaining).toBe(750_000);
    expect(p.percent).toBe(50);
  });

  it("clamps a hand-set tier above the spend to the start of the bar", () => {
    const p = tierProgress(0, "GOLD");
    expect(p.percent).toBe(0);
    expect(p.remaining).toBe(TIER_RULES.PLATINUM.minTopUp);
  });

  it("reads the top tier as complete", () => {
    const p = tierProgress(99_999_999, "ELITE");
    expect(p.next).toBeNull();
    expect(p.percent).toBe(100);
    expect(p.remaining).toBe(0);
  });
});

describe("tierDiscountFor", () => {
  it("takes the tier's percent off, rounded down to whole đ", () => {
    // Gold is 1%: 29.000 → 290, and 1.234 → 12,34 → 12.
    expect(tierDiscountFor(29_000n, "GOLD")).toBe(290n);
    expect(tierDiscountFor(29_000n, "CLASSIC")).toBe(0n);
    expect(tierDiscountFor(1_234n, "GOLD")).toBe(12n);
    expect(tierDiscountFor(100_000n, "PLATINUM")).toBe(3_000n);
  });

  it("prints a fractional percent with a decimal comma", () => {
    expect(formatTierPercent(1.5)).toBe("1,5");
    expect(formatTierPercent(3)).toBe("3");
  });
});

describe("ranks and reading", () => {
  it("orders the tiers and finds the next one", () => {
    expect(tierRank("CLASSIC")).toBeLessThan(tierRank("ELITE"));
    expect(nextTier("PLATINUM")).toBe("DIAMOND");
    expect(nextTier("DIAMOND")).toBe("ELITE");
    expect(nextTier("ELITE")).toBeNull();
  });

  it("reads unknown values, and a retired value, as Classic", () => {
    expect(readMemberTier("GOLD")).toBe("GOLD");
    expect(readMemberTier("gold")).toBe("CLASSIC");
    expect(readMemberTier("BRONZE")).toBe("CLASSIC");
    expect(readMemberTier(null)).toBe("CLASSIC");
  });
});
