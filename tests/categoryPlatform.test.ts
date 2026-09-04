import { describe, expect, it } from "vitest";

import {
  CATEGORY_PLATFORMS,
  isCategoryPlatform,
  parsePlatform,
} from "@/lib/categoryPlatform";

describe("category platform", () => {
  it("knows exactly the four the home page filters by", () => {
    expect(CATEGORY_PLATFORMS).toEqual(["PC", "MOBILE", "SPOOFER", "DMA"]);
    expect(isCategoryPlatform("PC")).toBe(true);
    expect(isCategoryPlatform("CONSOLE")).toBe(false);
    expect(isCategoryPlatform(1)).toBe(false);
  });

  it("stores what the admin picked, folded to the stored spelling", () => {
    // The select sends the value as is; a hand-typed client may not.
    expect(parsePlatform("MOBILE")).toEqual({ ok: true, value: "MOBILE" });
    expect(parsePlatform(" spoofer ")).toEqual({ ok: true, value: "SPOOFER" });
    expect(parsePlatform("dma")).toEqual({ ok: true, value: "DMA" });
  });

  it("clears on blank and refuses anything invented", () => {
    // Blank is a choice — no platform — not an error; a fourth platform is.
    expect(parsePlatform("")).toEqual({ ok: true, value: null });
    expect(parsePlatform(undefined)).toEqual({ ok: true, value: null });
    expect(parsePlatform("CONSOLE")).toEqual({ ok: false });
    expect(parsePlatform(42)).toEqual({ ok: false });
  });
});
