import { describe, expect, it } from "vitest";

import { CF_RANK_GROUPS, CF_RANKS, rankMatches, rankPlace, rankSpan } from "@/lib/cfRanks";

describe("cfRanks", () => {
  it("reads a place from the URL only inside the ladder", () => {
    expect(rankPlace("1")).toBe(1);
    expect(rankPlace(String(CF_RANKS.length))).toBe(CF_RANKS.length);
    expect(rankPlace("0")).toBeUndefined();
    expect(rankPlace("abc")).toBeUndefined();
    expect(rankPlace(null)).toBeUndefined();
  });

  it("spans the ranks between two places, either end open", () => {
    const captain = CF_RANKS.indexOf("Captain") + 1;
    const colonel = CF_RANKS.indexOf("Colonel") + 1;
    expect(rankSpan(captain, colonel)).toEqual(["Captain", "Major", "Lieutenant Colonel", "Colonel"]);
    expect(rankSpan(undefined, 2)).toEqual(["Trainee", "Private"]);
    expect(rankSpan(CF_RANKS.length)).toEqual(["Honor Marshall"]);
  });

  it("matches every way a rank is typed to that rank and no other", () => {
    for (const rank of CF_RANK_GROUPS.flatMap((group) => group.ranks)) {
      for (const typed of [rank.name, ...(rank.also ?? [])]) {
        for (const name of CF_RANKS) {
          expect(rankMatches(`${typed} 3`, name), `${typed} 3 as ${name}`).toBe(name === rank.name);
        }
      }
    }
  });

  it("keeps the Vietnamese ranks accounts were typed with", () => {
    expect(rankMatches("ĐẠI TÁ 2", "Colonel")).toBe(true);
    expect(rankMatches("Trung Tá", "Colonel")).toBe(false);
    expect(rankMatches("Nguyên Soái", "Marshall")).toBe(true);
  });
});
