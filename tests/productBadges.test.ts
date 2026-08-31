import { describe, expect, it } from "vitest";

import {
  badgePillClass,
  BADGE_COLORS,
  BADGE_ICONS,
  BADGE_ICON_KEYS,
  BADGE_PILL_BASE,
  DEFAULT_BADGE_COLOR,
  DEFAULT_BADGE_ICON,
  MAX_BADGES,
  MAX_BADGE_LENGTH,
  parseBadges,
  serializeBadges,
} from "@/lib/productBadges";

const RED = DEFAULT_BADGE_COLOR;
const STAR = DEFAULT_BADGE_ICON;

/**
 * The badges beside a tool's detection state are typed by the shop and kept in
 * one text column, `label|colour|icon` per line, so what matters is what
 * survives the round trip and what the page does when the column holds
 * something odd — a pill must never render blank or uncoloured, clearing the
 * form must actually clear the column, and the shorter line shapes written
 * before colours and icons existed have to keep working untouched.
 */
describe("parseBadges", () => {
  it("reads a label, its colour and its glyph", () => {
    expect(parseBadges("TOP #1 BÁN CHẠY|amber|crown\nMỚI RA MẮT|sky|sparkles")).toEqual([
      { label: "TOP #1 BÁN CHẠY", color: "amber", icon: "crown" },
      { label: "MỚI RA MẮT", color: "sky", icon: "sparkles" },
    ]);
  });

  it("reads a bare label as the defaults", () => {
    // How the first badges were stored, before either field existed. Nothing
    // was rewritten, so this shape has to keep working.
    expect(parseBadges("HOT")).toEqual([
      { label: "HOT", color: RED, icon: STAR },
    ]);
  });

  it("reads a colour-only line, from before icons existed", () => {
    expect(parseBadges("HOT|violet")).toEqual([
      { label: "HOT", color: "violet", icon: STAR },
    ]);
  });

  it("falls back for a colour or glyph that is not one", () => {
    expect(parseBadges("HOT|chartreuse|unicorn")).toEqual([
      { label: "HOT", color: RED, icon: STAR },
    ]);
    expect(parseBadges("HOT||")).toEqual([
      { label: "HOT", color: RED, icon: STAR },
    ]);
  });

  it("keeps `none`, which is a choice and not a missing value", () => {
    expect(parseBadges("SẮP HẾT HÀNG|amber|none")).toEqual([
      { label: "SẮP HẾT HÀNG", color: "amber", icon: "none" },
    ]);
  });

  it("is empty for a product that has none", () => {
    expect(parseBadges(null)).toEqual([]);
    expect(parseBadges("")).toEqual([]);
  });

  it("drops blank lines rather than rendering an empty pill", () => {
    expect(parseBadges("\n  \nHOT|red|flame\n\n")).toEqual([
      { label: "HOT", color: "red", icon: "flame" },
    ]);
  });

  it("trims each label", () => {
    expect(parseBadges("  HOT  |emerald|zap")).toEqual([
      { label: "HOT", color: "emerald", icon: "zap" },
    ]);
  });

  it("prints no more than the panel has room for", () => {
    expect(parseBadges("A\nB\nC\nD")).toHaveLength(MAX_BADGES);
  });
});

describe("serializeBadges", () => {
  it("stores the pair whole", () => {
    expect(
      serializeBadges([
        { label: "TOP #1 BÁN CHẠY", color: "amber", icon: "crown" },
        { label: "MỚI RA MẮT", color: "sky", icon: "sparkles" },
      ]),
    ).toBe("TOP #1 BÁN CHẠY|amber|crown\nMỚI RA MẮT|sky|sparkles");
  });

  it("accepts a bare string from a caller with nothing else to give", () => {
    expect(serializeBadges(["HOT"])).toBe(`HOT|${RED}|${STAR}`);
  });

  it("refuses a colour or glyph that is not one rather than storing it", () => {
    expect(
      serializeBadges([{ label: "HOT", color: "chartreuse", icon: "unicorn" }]),
    ).toBe(`HOT|${RED}|${STAR}`);
  });

  it("closes the gap when the first box is emptied", () => {
    // The form always sends both boxes; a blank first one must promote the
    // second rather than store a leading empty line.
    expect(
      serializeBadges([
        { label: "", color: "red", icon: "star" },
        { label: "MỚI RA MẮT", color: "sky", icon: "none" },
      ]),
    ).toBe("MỚI RA MẮT|sky|none");
  });

  it("clears the column when the shop empties the form", () => {
    expect(serializeBadges([{ label: "", color: "red" }, { label: "" }])).toBeNull();
    expect(serializeBadges([])).toBeNull();
  });

  it("stores null for a body that is not a list", () => {
    expect(serializeBadges(undefined)).toBeNull();
    expect(serializeBadges("HOT")).toBeNull();
    expect(serializeBadges({ 0: "HOT" })).toBeNull();
  });

  it("ignores entries with no label", () => {
    expect(serializeBadges([42, { color: "red" }, "HOT", null])).toBe(
      `HOT|${RED}|${STAR}`,
    );
  });

  it("caps a long label instead of refusing it", () => {
    const long = "X".repeat(MAX_BADGE_LENGTH + 20);
    expect(serializeBadges([long])).toBe(
      `${"X".repeat(MAX_BADGE_LENGTH)}|${RED}|${STAR}`,
    );
  });

  it("keeps the bar out of a label, since the bar is the separator", () => {
    expect(
      parseBadges(serializeBadges([{ label: "A|B", color: "sky", icon: "zap" }])),
    ).toEqual([{ label: "A B", color: "sky", icon: "zap" }]);
  });

  it("keeps only what the panel can show", () => {
    expect(serializeBadges(["A", "B", "C"])).toBe(
      `A|${RED}|${STAR}\nB|${RED}|${STAR}`,
    );
  });

  it("survives a round trip", () => {
    const stored = serializeBadges([
      { label: " HOT ", color: "violet", icon: "flame" },
      { label: "  SẮP HẾT HÀNG  ", color: "neutral", icon: "none" },
    ]);
    expect(parseBadges(stored)).toEqual([
      { label: "HOT", color: "violet", icon: "flame" },
      { label: "SẮP HẾT HÀNG", color: "neutral", icon: "none" },
    ]);
  });
});

describe("badgePillClass", () => {
  it("gives every colour a literal class, never a composed one", () => {
    // Tailwind reads literals, so `text-${color}-300` would compile to nothing
    // and the badge would print in the inherited colour — every colour the
    // same, with no error anywhere to say why.
    for (const [key, value] of Object.entries(BADGE_COLORS)) {
      expect(badgePillClass(key)).toBe(value.pill);
      expect(value.pill).toMatch(/^text-/);
      expect(value.pill).not.toMatch(/\$\{/);
      expect(value.swatch).toMatch(/^bg-/);
      expect(value.label.length).toBeGreaterThan(0);
    }
  });

  it("carries the card itself on the shared base", () => {
    // The colour half is only a text colour, so anything that forgets the base
    // renders words with no card at all.
    expect(BADGE_PILL_BASE).toMatch(/border/);
    expect(BADGE_PILL_BASE).toMatch(/bg-/);
    expect(BADGE_PILL_BASE).toMatch(/rounded/);
  });

  it("falls back rather than returning nothing for a bad name", () => {
    expect(badgePillClass("chartreuse")).toBe(
      BADGE_COLORS[DEFAULT_BADGE_COLOR].pill,
    );
  });
});

describe("the glyph set", () => {
  it("names every option for the picker and the screen reader", () => {
    for (const key of BADGE_ICON_KEYS) {
      expect(BADGE_ICONS[key].length).toBeGreaterThan(0);
    }
  });

  it("offers 'no glyph' as an option of its own", () => {
    // Without it a warning badge has to wear a commendation.
    expect(BADGE_ICON_KEYS).toContain("none");
  });
});
