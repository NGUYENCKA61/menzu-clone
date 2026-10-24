import { describe, expect, it } from "vitest";

import { CF_RANKS, rankPlace, rankSpan } from "@/lib/cfRanks";

describe("cfRanks", () => {
  it("reads a place from the URL only inside the ladder", () => {
    expect(rankPlace("1")).toBe(1);
    expect(rankPlace(String(CF_RANKS.length))).toBe(CF_RANKS.length);
    expect(rankPlace("0")).toBeUndefined();
    expect(rankPlace("abc")).toBeUndefined();
    expect(rankPlace(null)).toBeUndefined();
  });

  it("spans the ranks between two places, either end open", () => {
    const daiUy = CF_RANKS.indexOf("Đại úy") + 1;
    const daiTa = CF_RANKS.indexOf("Đại tá") + 1;
    expect(rankSpan(daiUy, daiTa)).toEqual(["Đại úy", "Thiếu tá", "Trung tá", "Thượng tá", "Đại tá"]);
    expect(rankSpan(undefined, 2)).toEqual(["Tân binh", "Binh nhì"]);
    expect(rankSpan(CF_RANKS.length)).toEqual(["Nguyên soái"]);
  });

  it("keeps every name out of every other, so contains never cross-matches", () => {
    for (const a of CF_RANKS) {
      for (const b of CF_RANKS) {
        if (a !== b) expect(b.toLowerCase().includes(a.toLowerCase())).toBe(false);
      }
    }
  });
});
