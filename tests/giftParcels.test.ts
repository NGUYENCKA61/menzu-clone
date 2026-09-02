import { describe, expect, it } from "vitest";

import {
  GIFT_LABEL_MAX,
  giftParcelProblem,
  giftPrizeId,
  isGiftParcel,
  readGiftLabel,
} from "@/lib/giftParcels";

describe("readGiftLabel", () => {
  it("reads a name and trims it", () => {
    expect(readGiftLabel("  Áo thun THICHTHIHACK  ")).toEqual({
      ok: true,
      label: "Áo thun THICHTHIHACK",
    });
  });

  it("treats blank, missing and null as no gift", () => {
    expect(readGiftLabel("")).toEqual({ ok: true, label: null });
    expect(readGiftLabel("   ")).toEqual({ ok: true, label: null });
    expect(readGiftLabel(undefined)).toEqual({ ok: true, label: null });
    expect(readGiftLabel(null)).toEqual({ ok: true, label: null });
  });

  it("refuses a name too long to put on a parcel", () => {
    const long = "a".repeat(GIFT_LABEL_MAX + 1);
    expect(readGiftLabel(long).ok).toBe(false);
    expect(readGiftLabel("a".repeat(GIFT_LABEL_MAX)).ok).toBe(true);
  });

  it("refuses what is not text at all", () => {
    expect(readGiftLabel(42).ok).toBe(false);
    expect(readGiftLabel({ label: "áo" }).ok).toBe(false);
  });
});

describe("giftParcelProblem", () => {
  const gift = { type: "GIFT", audience: "USERS", giftLabel: "Áo thun" };

  it("passes a targeted gift", () => {
    expect(giftParcelProblem(gift)).toBeNull();
  });

  it("says nothing about a notice that is not a gift at all", () => {
    expect(giftParcelProblem({ ...gift, giftLabel: null })).toBeNull();
    expect(
      giftParcelProblem({ type: "UPDATE", audience: "ALL", giftLabel: null }),
    ).toBeNull();
  });

  it("refuses a parcel on the wrong kind of notice", () => {
    expect(giftParcelProblem({ ...gift, type: "PROMO" })).toContain("Quà tặng");
  });

  it("refuses a parcel addressed to everybody", () => {
    expect(giftParcelProblem({ ...gift, audience: "ALL" })).toContain("cụ thể");
  });
});

describe("giftPrizeId", () => {
  it("carries the notice it came from", () => {
    expect(giftPrizeId("abc123")).toBe("gift:abc123");
  });

  it("is what tells a parcel apart from a wheel win", () => {
    expect(isGiftParcel(giftPrizeId("abc123"))).toBe(true);
    // Wheel prize ids are plain slugs — see readPrize in lib/spin.
    expect(isGiftParcel("gau-chikiwa")).toBe(false);
  });
});
