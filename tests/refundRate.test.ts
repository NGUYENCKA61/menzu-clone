import { describe, expect, it } from "vitest";

import { RATE_ABSENT, RATE_BAD, readRefundRate } from "@/lib/refundRate";

/**
 * The figure under "Chính sách bảo hành & hoàn tiền" is a promise a buyer can
 * hold the shop to, so the three states it can arrive in have to stay apart:
 * not sent (leave the column alone), cleared (no promise on the page), and a
 * number. Everything else is refused rather than clamped into a promise
 * nobody made.
 */
describe("readRefundRate", () => {
  it("reads a whole percent", () => {
    expect(readRefundRate(80)).toBe(80);
    expect(readRefundRate("80")).toBe(80);
  });

  it("keeps both ends of the range", () => {
    // 0 is a real answer — "we refund nothing" — and must not be mistaken for
    // the shop having said nothing.
    expect(readRefundRate(0)).toBe(0);
    expect(readRefundRate(100)).toBe(100);
  });

  it("says absent when the field was not sent", () => {
    expect(readRefundRate(undefined)).toBe(RATE_ABSENT);
  });

  it("clears the promise on an empty box", () => {
    expect(readRefundRate("")).toBeNull();
    expect(readRefundRate(null)).toBeNull();
  });

  it("refuses a figure out of range rather than clamping it", () => {
    expect(readRefundRate(101)).toBe(RATE_BAD);
    expect(readRefundRate(1000)).toBe(RATE_BAD);
    expect(readRefundRate(-1)).toBe(RATE_BAD);
  });

  it("refuses a fraction", () => {
    expect(readRefundRate(80.5)).toBe(RATE_BAD);
    expect(readRefundRate("80.5")).toBe(RATE_BAD);
  });

  it("refuses what is not a number at all", () => {
    expect(readRefundRate("tám mươi")).toBe(RATE_BAD);
    expect(readRefundRate(Number.NaN)).toBe(RATE_BAD);
    expect(readRefundRate(Number.POSITIVE_INFINITY)).toBe(RATE_BAD);
  });

  it("refuses values Number() would quietly turn into a percentage", () => {
    // Number(true) is 1 and Number([]) is 0 — neither is a figure anybody
    // typed into the box.
    expect(readRefundRate(true)).toBe(RATE_BAD);
    expect(readRefundRate([])).toBe(RATE_BAD);
    expect(readRefundRate({})).toBe(RATE_BAD);
  });
});
