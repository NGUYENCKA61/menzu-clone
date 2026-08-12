import { describe, expect, it } from "vitest";

import { evaluateVoucher, type VoucherRules } from "@/lib/voucher";

const NOW = new Date("2026-08-12T10:00:00Z");

function voucher(overrides: Partial<VoucherRules> = {}): VoucherRules {
  return {
    percentOff: 10,
    amountOff: null,
    minOrder: null,
    startsAt: null,
    expiresAt: null,
    maxUses: null,
    usedCount: 0,
    active: true,
    ...overrides,
  };
}

describe("evaluateVoucher", () => {
  it("takes a percentage off the price being charged", () => {
    const result = evaluateVoucher(voucher({ percentOff: 15 }), 3_960_000n, NOW);
    expect(result).toEqual({ ok: true, cut: 594_000n, total: 3_366_000n });
  });

  it("takes a flat amount off when there is no percentage", () => {
    const result = evaluateVoucher(
      voucher({ percentOff: null, amountOff: 200_000n }),
      1_000_000n,
      NOW,
    );
    expect(result).toEqual({ ok: true, cut: 200_000n, total: 800_000n });
  });

  it("never pays the customer: the most it can do is make the order free", () => {
    const result = evaluateVoucher(
      voucher({ percentOff: null, amountOff: 5_000_000n }),
      1_000_000n,
      NOW,
    );
    expect(result).toEqual({ ok: true, cut: 1_000_000n, total: 0n });
  });

  it("refuses a missing, inactive, expired or spent code", () => {
    expect(evaluateVoucher(null, 1_000_000n, NOW).ok).toBe(false);
    expect(evaluateVoucher(voucher({ active: false }), 1_000_000n, NOW).ok).toBe(false);
    expect(
      evaluateVoucher(
        voucher({ expiresAt: new Date("2026-08-01T00:00:00Z") }),
        1_000_000n,
        NOW,
      ).ok,
    ).toBe(false);
    expect(
      evaluateVoucher(voucher({ maxUses: 5, usedCount: 5 }), 1_000_000n, NOW).ok,
    ).toBe(false);
  });

  it("refuses a code whose campaign has not started", () => {
    const result = evaluateVoucher(
      voucher({ startsAt: new Date("2026-09-01T00:00:00Z") }),
      1_000_000n,
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/chưa tới ngày/);
  });

  it("honours minOrder, which the checkout used to ignore", () => {
    const under = evaluateVoucher(voucher({ minOrder: 2_000_000n }), 1_000_000n, NOW);
    expect(under.ok).toBe(false);
    if (!under.ok) expect(under.error).toMatch(/2\.000\.000/);

    expect(evaluateVoucher(voucher({ minOrder: 2_000_000n }), 2_000_000n, NOW).ok).toBe(true);
  });

  it("refuses a code that would take nothing off", () => {
    const result = evaluateVoucher(
      voucher({ percentOff: null, amountOff: 0n }),
      1_000_000n,
      NOW,
    );
    expect(result.ok).toBe(false);
  });

  it("expires exactly on the boundary rather than a moment after", () => {
    expect(evaluateVoucher(voucher({ expiresAt: NOW }), 1_000_000n, NOW).ok).toBe(false);
    expect(
      evaluateVoucher(
        voucher({ expiresAt: new Date(NOW.getTime() + 1) }),
        1_000_000n,
        NOW,
      ).ok,
    ).toBe(true);
  });
});
