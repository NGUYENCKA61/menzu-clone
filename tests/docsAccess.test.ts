import { describe, expect, it } from "vitest";

import {
  DOCS_MIN_WINDOW_MS,
  docsAccessFrom,
  docsWindowEnd,
} from "@/lib/docsAccess";

const HOUR = 60 * 60 * 1000;
const at = new Date("2026-10-12T10:00:00Z");

describe("one order's reading window", () => {
  it("is the key's duration, but never under two days", () => {
    expect(docsWindowEnd(at, 24)?.getTime()).toBe(
      at.getTime() + DOCS_MIN_WINDOW_MS,
    );
    expect(docsWindowEnd(at, 168)?.getTime()).toBe(at.getTime() + 168 * HOUR);
    expect(docsWindowEnd(at, 720)?.getTime()).toBe(at.getTime() + 720 * HOUR);
  });

  it("never ends for a key with no end", () => {
    expect(docsWindowEnd(at, null)).toBeNull();
    expect(docsWindowEnd(at, 999999999)).toBeNull();
  });
});

describe("the account's standing", () => {
  it("is never without an order, open inside a window, expired after", () => {
    expect(docsAccessFrom([], at)).toEqual({ state: "never", until: null });
    const dayKey = [{ createdAt: at, durationHours: 24 }];
    const soon = new Date(at.getTime() + 36 * HOUR);
    const later = new Date(at.getTime() + 49 * HOUR);
    expect(docsAccessFrom(dayKey, soon)).toEqual({
      state: "open",
      until: new Date(at.getTime() + 48 * HOUR).toISOString(),
    });
    expect(docsAccessFrom(dayKey, later)).toEqual({
      state: "expired",
      until: new Date(at.getTime() + 48 * HOUR).toISOString(),
    });
  });

  it("names the window that runs longest, and a key without end wins", () => {
    const old = new Date(at.getTime() - 10 * 24 * HOUR);
    const orders = [
      { createdAt: old, durationHours: 720 },
      { createdAt: at, durationHours: 24 },
    ];
    expect(docsAccessFrom(orders, at).until).toBe(
      new Date(old.getTime() + 720 * HOUR).toISOString(),
    );
    expect(
      docsAccessFrom([...orders, { createdAt: old, durationHours: null }], at),
    ).toEqual({ state: "open", until: null });
  });
});
