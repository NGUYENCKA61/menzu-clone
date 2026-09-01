import { describe, expect, it } from "vitest";

import {
  DEFAULT_STATUS_PILL_MODE,
  PILL_ABSENT,
  PILL_BAD,
  readStatusPill,
  showsStatusPill,
  STATUS_PILL_MODES,
  STATUS_PILL_MODE_KEYS,
  statusPillColumn,
  statusPillMode,
} from "@/lib/statusPill";

/**
 * The detection pill shares a row with the shop's badges on a tool's own page,
 * and the column that governs it holds three states, not two. What matters is
 * that the third one — "nobody has said" — keeps behaving like a rule rather
 * than like a stored answer: delete a tool's last badge and its pill comes
 * back, unless the shop actually chose to hide it.
 */
describe("showsStatusPill", () => {
  it("hides the pill for a tool that already carries a badge", () => {
    expect(showsStatusPill(null, 1)).toBe(false);
    expect(showsStatusPill(null, 2)).toBe(false);
  });

  it("shows it for a tool that carries none", () => {
    expect(showsStatusPill(null, 0)).toBe(true);
  });

  it("obeys the shop over the badges, both ways", () => {
    expect(showsStatusPill(true, 2)).toBe(true);
    expect(showsStatusPill(false, 0)).toBe(false);
  });

  it("treats a row written before the column existed as undecided", () => {
    expect(showsStatusPill(undefined, 0)).toBe(true);
    expect(showsStatusPill(undefined, 1)).toBe(false);
  });
});

describe("the picker and the column", () => {
  it("round trips every mode", () => {
    for (const mode of STATUS_PILL_MODE_KEYS) {
      expect(statusPillMode(statusPillColumn(mode))).toBe(mode);
    }
  });

  it("reads the column the picker was built from", () => {
    expect(statusPillMode(null)).toBe("auto");
    expect(statusPillMode(undefined)).toBe("auto");
    expect(statusPillMode(true)).toBe("show");
    expect(statusPillMode(false)).toBe("hide");
  });

  it("falls back to auto for a mode nobody defined", () => {
    expect(statusPillColumn("banana")).toBeNull();
    expect(statusPillColumn(undefined)).toBeNull();
  });

  it("names every mode for the select", () => {
    expect(STATUS_PILL_MODE_KEYS).toContain(DEFAULT_STATUS_PILL_MODE);
    for (const mode of STATUS_PILL_MODE_KEYS) {
      expect(STATUS_PILL_MODES[mode].length).toBeGreaterThan(0);
    }
  });
});

describe("readStatusPill", () => {
  it("leaves the column alone when the body never mentions it", () => {
    // Every other save on this page PATCHes the same route; a body about the
    // description must not reset the pill to auto on its way past.
    expect(readStatusPill(undefined)).toBe(PILL_ABSENT);
  });

  it("reads each mode as the value the column stores", () => {
    expect(readStatusPill("auto")).toBeNull();
    expect(readStatusPill("show")).toBe(true);
    expect(readStatusPill("hide")).toBe(false);
  });

  it("takes an explicit null as auto", () => {
    expect(readStatusPill(null)).toBeNull();
  });

  it("refuses anything that is not a mode rather than filing it as auto", () => {
    expect(readStatusPill("visible")).toBe(PILL_BAD);
    expect(readStatusPill(true)).toBe(PILL_BAD);
    expect(readStatusPill(1)).toBe(PILL_BAD);
    expect(readStatusPill({ mode: "show" })).toBe(PILL_BAD);
  });
});
