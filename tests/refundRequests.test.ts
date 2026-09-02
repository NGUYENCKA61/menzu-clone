import { describe, expect, it } from "vitest";

import {
  promisedRefund,
  readRefundAmount,
  readReason,
  REFUND_METHOD,
  REFUND_METHOD_KEYS,
  REASON_MAX,
  REASON_MIN,
  REASON_TOO_LONG,
  REASON_TOO_SHORT,
  refundBlockedReason,
  refundDeadline,
  refundWindowClosed,
  REFUND_STATUS,
  REFUND_WINDOW_DAYS,
} from "@/lib/refundRequests";

/**
 * The refund form and the route it posts to both read these, so what matters
 * is that neither can be talked into accepting something the other refuses —
 * and that the two reasons an order is off-limits stay distinguishable, since
 * "you were never charged" and "we are already looking at it" need different
 * answers.
 */
describe("readReason", () => {
  it("takes a real sentence", () => {
    const said = "Key mua xong dùng được 2 tiếng thì bị khoá tài khoản game.";
    expect(readReason(said)).toEqual({ ok: true, reason: said });
  });

  it("trims before it measures", () => {
    const said = "  " + "x".repeat(REASON_MIN) + "  ";
    expect(readReason(said)).toEqual({ ok: true, reason: "x".repeat(REASON_MIN) });
    // Padding must not carry a too-short reason over the line.
    expect(readReason("  " + "x".repeat(REASON_MIN - 1) + "   ")).toEqual({
      ok: false,
      error: REASON_TOO_SHORT,
    });
  });

  it("refuses a word where a sentence belongs", () => {
    expect(readReason("loi")).toEqual({ ok: false, error: REASON_TOO_SHORT });
    expect(readReason("")).toEqual({ ok: false, error: REASON_TOO_SHORT });
  });

  it("refuses an essay", () => {
    expect(readReason("x".repeat(REASON_MAX + 1))).toEqual({
      ok: false,
      error: REASON_TOO_LONG,
    });
    expect(readReason("x".repeat(REASON_MAX)).ok).toBe(true);
  });

  it("refuses anything that is not text at all", () => {
    expect(readReason(undefined).ok).toBe(false);
    expect(readReason(null).ok).toBe(false);
    expect(readReason(42).ok).toBe(false);
    expect(readReason({ reason: "a".repeat(50) }).ok).toBe(false);
  });
});

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

describe("refundBlockedReason", () => {
  const bought = new Date("2026-09-01T10:00:00Z");
  /** Inside the window: a day after the sale. */
  const soon = new Date("2026-09-02T10:00:00Z");
  /** Outside it: a week after. */
  const late = new Date("2026-09-08T10:00:00Z");
  const paid = { orderStatus: "PAID", openRequest: false, purchasedAt: bought };

  it("lets a paid order inside the window through", () => {
    expect(refundBlockedReason({ ...paid, now: soon })).toBeNull();
  });

  it("refuses an order that was never charged", () => {
    for (const orderStatus of ["PENDING", "CANCELLED", "REFUNDED"]) {
      expect(
        refundBlockedReason({ ...paid, orderStatus, now: soon }),
      ).toMatch(/đã thanh toán/);
    }
  });

  it("refuses a second request while the first is still open", () => {
    expect(
      refundBlockedReason({ ...paid, openRequest: true, now: soon }),
    ).toMatch(/đang chờ/);
  });

  it("refuses once three days have passed", () => {
    expect(refundBlockedReason({ ...paid, now: late })).toMatch(/quá 3 ngày/);
  });

  it("says the money reason first when both are true", () => {
    // An unpaid order is the more basic refusal; telling the buyer to wait for
    // a decision on an order that was never charged would be nonsense.
    expect(
      refundBlockedReason({
        ...paid,
        orderStatus: "CANCELLED",
        openRequest: true,
        now: late,
      }),
    ).toMatch(/đã thanh toán/);
  });

  it("does not tell somebody who asked in time that they are late", () => {
    // The request is open because they made it on day one; the shop is simply
    // still deciding. "Quá hạn" here would blame them for the wait.
    expect(
      refundBlockedReason({ ...paid, openRequest: true, now: late }),
    ).toMatch(/đang chờ/);
  });

  it("allows another round after a decision, while the window lasts", () => {
    // Only an OPEN request bars the way — the caller passes false once the
    // shop has answered, so a rejection can be replied to.
    expect(refundBlockedReason({ ...paid, now: soon })).toBeNull();
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
    for (const key of REFUND_METHOD_KEYS) {
      expect(REFUND_METHOD[key].label.length).toBeGreaterThan(0);
      expect(REFUND_METHOD[key].hint.length).toBeGreaterThan(0);
    }
  });
});
