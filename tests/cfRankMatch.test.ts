import { describe, expect, it } from "vitest";

import { CF_RANK_MATCHES, rankMatchName, rankMatchPlace } from "@/lib/cfRankMatch";

describe("cfRankMatch", () => {
  it("reads a place from the URL only inside the ladder", () => {
    expect(rankMatchPlace("1")).toBe(1);
    expect(rankMatchPlace(String(CF_RANK_MATCHES.length))).toBe(CF_RANK_MATCHES.length);
    expect(rankMatchPlace(String(CF_RANK_MATCHES.length + 1))).toBeUndefined();
    expect(rankMatchPlace("0")).toBeUndefined();
    expect(rankMatchPlace("2.5")).toBeUndefined();
    expect(rankMatchPlace("abc")).toBeUndefined();
    expect(rankMatchPlace(null)).toBeUndefined();
  });

  it("names a stored tier, and nothing for no tier", () => {
    expect(rankMatchName(1)).toBe("Bronze");
    expect(rankMatchName(CF_RANK_MATCHES.length)).toBe("Top 100");
    expect(rankMatchName(0)).toBeNull();
    expect(rankMatchName(CF_RANK_MATCHES.length + 1)).toBeNull();
  });
});
