import { describe, expect, it } from "vitest";

import {
  formatDuration,
  formatDurationInline,
  splitDuration,
  toHours,
} from "@/lib/duration";

/**
 * One number in the database, two units on screen. The round trip is what
 * matters: a shop that types "7 ngày" must see "7 ngày" when it reopens the
 * row, never "168 giờ".
 */
describe("package durations", () => {
  it("prints hours under a day and whole days above", () => {
    expect(formatDuration(3)).toBe("3 giờ");
    expect(formatDuration(12)).toBe("12 giờ");
    expect(formatDuration(24)).toBe("1 ngày");
    expect(formatDuration(168)).toBe("7 ngày");
    expect(formatDuration(720)).toBe("30 ngày");
    // Not a whole number of days, so the day unit would have to round.
    expect(formatDuration(36)).toBe("36 giờ");
  });

  it("treats a missing length as a key that never expires", () => {
    expect(formatDuration(null)).toBe("Vĩnh viễn");
    // Nothing writes these, but a hand-edited row should not print "0 giờ".
    expect(formatDuration(0)).toBe("Vĩnh viễn");
    expect(formatDuration(-5)).toBe("Vĩnh viễn");
    expect(formatDurationInline(null)).toBe("vĩnh viễn");
    expect(formatDurationInline(24)).toBe("1 ngày");
  });

  it("reopens an edit form in the unit the shop typed", () => {
    expect(splitDuration(3)).toEqual({ value: "3", unit: "hour" });
    expect(splitDuration(168)).toEqual({ value: "7", unit: "day" });
    // A lifetime tier comes back as an empty box with the picker already on
    // "vĩnh viễn". It used to open on "ngày" with nothing in the number box,
    // which reads as a duration somebody forgot to fill in rather than as the
    // deliberate choice it is — and saving that form silently sold a lifetime
    // key. The picker now says what the row means.
    expect(splitDuration(null)).toEqual({ value: "", unit: "forever" });
  });

  it("survives the round trip in both units", () => {
    for (const hours of [1, 3, 12, 24, 36, 168, 720]) {
      const { value, unit } = splitDuration(hours);
      expect(toHours(value, unit)).toBe(hours);
    }
  });

  it("reads a blank or junk box as vĩnh viễn rather than as zero", () => {
    expect(toHours("", "day")).toBeNull();
    expect(toHours("abc", "hour")).toBeNull();
    expect(toHours("0", "day")).toBeNull();
    // Digits are kept out of whatever else was pasted in.
    expect(toHours("7 ngày", "day")).toBe(168);
  });
});
