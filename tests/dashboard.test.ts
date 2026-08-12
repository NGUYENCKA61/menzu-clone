import { describe, expect, it } from "vitest";

import {
  formatPercent,
  lastDays,
  linePoints,
  percentChange,
  txState,
} from "@/lib/dashboard";
import { startOfDayVn } from "@/lib/time";

describe("lastDays", () => {
  const today = startOfDayVn(new Date("2026-08-13T09:00:00Z"));

  it("ends on today and runs back", () => {
    const days = lastDays(today, 7);
    expect(days).toHaveLength(7);
    expect(days[6]!.start.getTime()).toBe(today.getTime());
    expect(days[0]!.start.getTime()).toBe(today.getTime() - 6 * 24 * 3600 * 1000);
  });

  it("leaves no gap and no overlap between buckets", () => {
    // A row landing in two buckets is counted twice; a gap loses it entirely.
    const days = lastDays(today, 7);
    for (let i = 1; i < days.length; i += 1) {
      expect(days[i]!.start.getTime()).toBe(days[i - 1]!.end.getTime());
    }
  });

  it("labels the days in Vietnam, not UTC", () => {
    // 13/08/2026 is a Thursday there, and the boundary is 17:00 UTC the day
    // before — read in UTC the label would be one day out for seven hours.
    expect(lastDays(today, 1)[0]!.label).toBe("T5");
  });
});

describe("percentChange", () => {
  it("measures the move between two periods", () => {
    expect(percentChange(110, 100)).toBeCloseTo(10);
    expect(percentChange(80, 100)).toBeCloseTo(-20);
  });

  it("refuses to compare against nothing", () => {
    // Growth from zero is not "+100%", it is undefined, and printing a figure
    // there tells the shop it doubled when it started from nothing.
    expect(percentChange(500, 0)).toBeNull();
    expect(percentChange(500, -1)).toBeNull();
    expect(percentChange(Number.NaN, 100)).toBeNull();
  });
});

describe("formatPercent", () => {
  it("reads in the Vietnamese convention", () => {
    expect(formatPercent(12.84)).toBe("+12,8%");
    expect(formatPercent(-4.05)).toBe("-4,1%");
    expect(formatPercent(0)).toBe("+0,0%");
  });
});

describe("linePoints", () => {
  it("plots against zero rather than its own floor", () => {
    // 98/100 against its own range is a mountain; against zero it is flat,
    // which is what actually happened.
    const [first, , last] = linePoints([98, 99, 100], 100, 100, 0).split(" ");
    expect(Number(first!.split(",")[1])).toBeCloseTo(2, 0);
    expect(Number(last!.split(",")[1])).toBe(0);
  });

  it("puts a flat zero week on the floor", () => {
    // Halfway up the box would read as steady trade during a dead week.
    const ys = linePoints([0, 0, 0], 100, 100, 0)
      .split(" ")
      .map((p) => Number(p.split(",")[1]));
    expect(ys).toEqual([100, 100, 100]);
  });

  it("spreads the points across the full width", () => {
    const xs = linePoints([1, 2, 3], 100, 100, 0)
      .split(" ")
      .map((p) => Number(p.split(",")[0]));
    expect(xs).toEqual([0, 50, 100]);
  });

  it("is empty for an empty series", () => {
    expect(linePoints([], 100, 100)).toBe("");
  });
});

describe("txState", () => {
  it("collapses two status enums onto one vocabulary", () => {
    expect(txState("topup", "COMPLETED")).toBe("SUCCESS");
    expect(txState("topup", "PENDING")).toBe("PENDING");
    // No money arrived, whatever the shop does about a late transfer.
    expect(txState("topup", "EXPIRED")).toBe("FAILED");
    expect(txState("topup", "FAILED")).toBe("FAILED");

    expect(txState("order", "PAID")).toBe("SUCCESS");
    expect(txState("order", "PENDING")).toBe("PENDING");
    expect(txState("order", "CANCELLED")).toBe("FAILED");
    expect(txState("order", "REFUNDED")).toBe("FAILED");
  });
});
