import { describe, expect, it } from "vitest";

import { columnsOf, FIRST_ROWS, hiddenAfter, revealLimit } from "@/lib/rowReveal";

describe("row reveal", () => {
  it("shows one line first, whatever the grid's width", () => {
    expect(FIRST_ROWS).toBe(1);
    // Desktop, tablet, phone: four, three, two columns.
    expect(revealLimit(4)).toBe(4);
    expect(revealLimit(3)).toBe(3);
    expect(revealLimit(2)).toBe(2);
    // More lines, when a caller asks for them.
    expect(revealLimit(4, 3)).toBe(12);
  });

  it("never computes a limit that hides everything", () => {
    expect(revealLimit(0)).toBe(1);
    expect(revealLimit(4, 0)).toBe(4);
    expect(revealLimit(2.9, 1.9)).toBe(2);
  });

  it("counts what is still behind the button", () => {
    expect(hiddenAfter(13, 4)).toBe(9);
    expect(hiddenAfter(4, 4)).toBe(0);
    expect(hiddenAfter(2, 4)).toBe(0);
  });

  it("reads the column count off a computed grid template", () => {
    expect(columnsOf("290px 290px 290px 290px")).toBe(4);
    expect(columnsOf("  120.5px 120.5px ")).toBe(2);
    // No grid at all — the fallback shows something rather than nothing.
    expect(columnsOf("none")).toBe(1);
    expect(columnsOf("")).toBe(1);
  });
});
