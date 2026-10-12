import { describe, expect, it } from "vitest";

import {
  FREE_CLAIM_GAP_MS,
  freePackageOf,
  nextFreeClaimAt,
} from "@/lib/freeKeyRules";

describe("a free tool's tier", () => {
  it("is the cheapest tier at the 1đ placeholder or nothing, else none", () => {
    expect(
      freePackageOf([
        { id: "a", price: 1 },
        { id: "b", price: 50000 },
      ]),
    ).toEqual({ id: "a", price: 1 });
    expect(
      freePackageOf([
        { id: "a", price: 0 },
        { id: "b", price: 1 },
      ]),
    ).toEqual({ id: "a", price: 0 });
    expect(freePackageOf([{ id: "b", price: 50000 }])).toBeNull();
    expect(freePackageOf([])).toBeNull();
  });
});

describe("one key a day", () => {
  it("waits a day from the last key, then no longer", () => {
    const now = new Date("2026-10-12T10:00:00Z");
    expect(nextFreeClaimAt(null, now)).toBeNull();
    const recent = new Date(now.getTime() - 60 * 60 * 1000);
    expect(nextFreeClaimAt(recent, now)?.getTime()).toBe(
      recent.getTime() + FREE_CLAIM_GAP_MS,
    );
    const old = new Date(now.getTime() - FREE_CLAIM_GAP_MS - 1);
    expect(nextFreeClaimAt(old, now)).toBeNull();
  });
});
