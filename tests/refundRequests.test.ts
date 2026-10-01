import { describe, expect, it } from "vitest";

import {
  promisedRefund,
  readRefundAmount,
  REFUND_METHOD,
  REFUND_METHOD_KEYS,
  refundDeadline,
  refundWindowClosed,
  REFUND_STATUS,
  REFUND_WINDOW_DAYS,
} from "@/lib/refundRequests";

/**
 * Since 01/10/2026 buyers never ask for refunds themselves — the warranty desk
 * refunds from a ticket — so what is left to pin down here is what that desk
 * reads: the window it shows beside a report, the states and labels a refund
 * wears, the figure it suggests and the figure it accepts.
 */

describe("the three-day window", () => {
  const bought = new Date("2026-09-01T10:00:00Z");

  it("is open right up to the deadline, and the deadline itself counts", () => {
    expect(refundWindowClosed(bought, bought)).toBe(false);
    expect(refundWindowClosed(bought, refundDeadline(bought))).toBe(false);
    // A boundary that refuses the millisecond it names is one somebody will
    // hit and not believe.
    expect(
      refundWindowClosed(bought, new Date(refundDeadline(bought).getTime() - 1)),
    ).toBe(false);
  });

  it("is closed a millisecond after", () => {
    expect(
      refundWindowClosed(bought, new Date(refundDeadline(bought).getTime() + 1)),
    ).toBe(true);
  });

  it("lands the deadline exactly three days on", () => {
    expect(refundDeadline(bought).toISOString()).toBe("2026-09-04T10:00:00.000Z");
    expect(REFUND_WINDOW_DAYS).toBe(3);
  });
});

describe("REFUND_STATUS", () => {
  it("names and colours every state, with literal classes", () => {
    for (const [key, value] of Object.entries(REFUND_STATUS)) {
      expect(value.label.length).toBeGreaterThan(0);
      // Tailwind reads literals; a composed class compiles to nothing and the
      // pill would print uncoloured with no error anywhere to say why.
      expect(value.tile).not.toMatch(/\$\{/);
      expect(value.dot).toMatch(/^bg-/);
      expect(["PENDING", "APPROVED", "REJECTED"]).toContain(key);
    }
  });
});

describe("promisedRefund", () => {
  it("works the published rate out on the order", () => {
    expect(promisedRefund(100_000, 70)).toBe(70_000);
    expect(promisedRefund(46_000, 70)).toBe(32_200);
  });

  it("rounds down to the đồng", () => {
    // Money, and there is no fraction of a đồng to hand over.
    expect(promisedRefund(999, 33)).toBe(329);
  });

  it("suggests nothing where the shop promised nothing", () => {
    // A suggested zero would read as "we owe you nothing", which is not what
    // an unset rate means.
    expect(promisedRefund(100_000, null)).toBeNull();
  });

  it("handles the ends", () => {
    expect(promisedRefund(100_000, 100)).toBe(100_000);
    expect(promisedRefund(100_000, 0)).toBe(0);
  });
});

describe("readRefundAmount", () => {
  it("takes a figure inside the order", () => {
    expect(readRefundAmount("32200", 46_000)).toEqual({ ok: true, amount: 32_200 });
    expect(readRefundAmount(46_000, 46_000)).toEqual({ ok: true, amount: 46_000 });
  });

  it("refuses more than was paid", () => {
    // The one time this happens by accident it will be an extra zero.
    expect(readRefundAmount(460_000, 46_000).ok).toBe(false);
  });

  it("refuses nothing and less than nothing", () => {
    expect(readRefundAmount(0, 46_000).ok).toBe(false);
    expect(readRefundAmount(-5_000, 46_000).ok).toBe(false);
  });

  it("refuses anything that is not a whole number", () => {
    expect(readRefundAmount("32.5", 46_000).ok).toBe(false);
    expect(readRefundAmount("ba mươi nghìn", 46_000).ok).toBe(false);
    expect(readRefundAmount(undefined, 46_000).ok).toBe(false);
    expect(readRefundAmount(null, 46_000).ok).toBe(false);
    expect(readRefundAmount(Infinity, 46_000).ok).toBe(false);
  });

  it("trims what was typed before reading it", () => {
    expect(readRefundAmount("  32200  ", 46_000)).toEqual({
      ok: true,
      amount: 32_200,
    });
  });
});

describe("REFUND_METHOD", () => {
  it("offers both ways out, each with a word about what it does", () => {
    expect(REFUND_METHOD_KEYS).toEqual(["WALLET", "MANUAL"]);
    // The owner's two options (01/10/2026).
    expect(REFUND_METHOD.WALLET.label).toBe("Hoàn qua tài khoản");
    expect(REFUND_METHOD.MANUAL.label).toBe("Hoàn qua ngân hàng");
    for (const key of REFUND_METHOD_KEYS) {
      expect(REFUND_METHOD[key].label.length).toBeGreaterThan(0);
      expect(REFUND_METHOD[key].hint.length).toBeGreaterThan(0);
    }
  });
});
