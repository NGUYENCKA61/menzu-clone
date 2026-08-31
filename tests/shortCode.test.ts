import { describe, expect, it } from "vitest";

import { makeShortCode } from "@/lib/shortCode";

describe("makeShortCode", () => {
  it("always returns the prefix plus eight characters", () => {
    // The old Math.random().toString(36) sometimes returned four, because
    // trailing zeroes are dropped — and every lost character halved the space.
    for (let i = 0; i < 500; i += 1) {
      const code = makeShortCode("DH");
      expect(code).toHaveLength(10);
      expect(code.startsWith("DH")).toBe(true);
    }
  });

  it("uses no character that can be misread down a phone line", () => {
    const body = Array.from({ length: 200 }, () => makeShortCode("GD").slice(2)).join("");
    expect(body).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
    for (const ch of ["I", "O", "0", "1"]) expect(body).not.toContain(ch);
  });

  it("does not repeat itself over a realistic run of orders", () => {
    const seen = new Set(Array.from({ length: 5000 }, () => makeShortCode("DH")));
    expect(seen.size).toBe(5000);
  });
});
