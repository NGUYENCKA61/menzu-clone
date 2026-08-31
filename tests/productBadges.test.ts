import { describe, expect, it } from "vitest";

import {
  MAX_BADGES,
  MAX_BADGE_LENGTH,
  parseBadges,
  serializeBadges,
} from "@/lib/productBadges";

/**
 * The badges beside a tool's detection state are typed by the shop and kept in
 * one text column, so what matters is what survives the round trip and what the
 * page does when the column holds something odd — a pill must never render
 * blank, and clearing the form must actually clear the column.
 */
describe("parseBadges", () => {
  it("reads one label per line", () => {
    expect(parseBadges("TOP #1 BÁN CHẠY\nMỚI RA MẮT")).toEqual([
      "TOP #1 BÁN CHẠY",
      "MỚI RA MẮT",
    ]);
  });

  it("is empty for a product that has none", () => {
    expect(parseBadges(null)).toEqual([]);
    expect(parseBadges("")).toEqual([]);
  });

  it("drops blank lines rather than rendering an empty pill", () => {
    expect(parseBadges("\n  \nHOT\n\n")).toEqual(["HOT"]);
  });

  it("trims each label", () => {
    expect(parseBadges("  HOT  ")).toEqual(["HOT"]);
  });

  it("prints no more than the panel has room for", () => {
    expect(parseBadges("A\nB\nC\nD")).toHaveLength(MAX_BADGES);
  });
});

describe("serializeBadges", () => {
  it("stores the pair as lines", () => {
    expect(serializeBadges(["TOP #1 BÁN CHẠY", "MỚI RA MẮT"])).toBe(
      "TOP #1 BÁN CHẠY\nMỚI RA MẮT",
    );
  });

  it("closes the gap when the first box is emptied", () => {
    // The form always sends both boxes; a blank first one must promote the
    // second rather than store a leading empty line.
    expect(serializeBadges(["", "MỚI RA MẮT"])).toBe("MỚI RA MẮT");
  });

  it("clears the column when the shop empties the form", () => {
    expect(serializeBadges(["", ""])).toBeNull();
    expect(serializeBadges([])).toBeNull();
  });

  it("stores null for a body that is not a list", () => {
    expect(serializeBadges(undefined)).toBeNull();
    expect(serializeBadges("HOT")).toBeNull();
    expect(serializeBadges({ 0: "HOT" })).toBeNull();
  });

  it("ignores non-string entries", () => {
    expect(serializeBadges([42, "HOT", null])).toBe("HOT");
  });

  it("caps a long label instead of refusing it", () => {
    const long = "X".repeat(MAX_BADGE_LENGTH + 20);
    expect(serializeBadges([long])).toBe("X".repeat(MAX_BADGE_LENGTH));
  });

  it("keeps only what the panel can show", () => {
    expect(serializeBadges(["A", "B", "C"])).toBe("A\nB");
  });

  it("survives a round trip", () => {
    const stored = serializeBadges([" HOT ", "  SẮP HẾT HÀNG  "]);
    expect(parseBadges(stored)).toEqual(["HOT", "SẮP HẾT HÀNG"]);
  });
});
