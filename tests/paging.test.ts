import { describe, expect, it } from "vitest";

import { GAP, pageHrefFor, pageStrip } from "@/lib/paging";

describe("pageHrefFor", () => {
  it("keeps every filter and changes only the page", () => {
    const query = { sort: "price-asc", min: "10000", skin: "Prime", page: "1" };
    expect(pageHrefFor("/hack-valorant", query, 2)).toBe(
      "/hack-valorant?sort=price-asc&min=10000&skin=Prime&page=2",
    );
  });

  it("writes page one as the bare address, not ?page=1", () => {
    expect(pageHrefFor("/hack-valorant", { sort: "newest", page: "3" }, 1)).toBe(
      "/hack-valorant?sort=newest",
    );
    expect(pageHrefFor("/hack-valorant", {}, 1)).toBe("/hack-valorant");
  });

  it("leaves blank and non-string values out rather than writing them back", () => {
    expect(
      pageHrefFor("/x", { min: "", max: undefined, nguon: "all", odd: ["a", "b"] }, 2),
    ).toBe("/x?nguon=all&page=2");
  });

  it("encodes a value that needs it", () => {
    expect(pageHrefFor("/x", { pm: "bản MS" }, 2)).toBe("/x?pm=b%E1%BA%A3n+MS&page=2");
  });
});

describe("pageStrip", () => {
  it("pins both ends with a gap only where pages are hidden", () => {
    expect(pageStrip(30, 65)).toEqual([1, GAP, 28, 29, 30, 31, 32, GAP, 65]);
    expect(pageStrip(1, 3)).toEqual([1, 2, 3]);
    expect(pageStrip(3, 7)).toEqual([1, 2, 3, 4, 5, GAP, 7]);
  });
});
