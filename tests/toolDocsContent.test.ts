import { describe, expect, it } from "vitest";

import { hasOwnToolDoc } from "@/lib/toolDocsContent";

describe("hasOwnToolDoc", () => {
  it("is false with neither a guide nor requirements (the defaults print)", () => {
    expect(hasOwnToolDoc({ guide: null, requirements: null })).toBe(false);
    expect(hasOwnToolDoc({ guide: "", requirements: [] })).toBe(false);
    expect(hasOwnToolDoc({ guide: "   ", requirements: "" })).toBe(false);
  });

  it("does not count an empty editor document or an empty stored list", () => {
    expect(hasOwnToolDoc({ guide: "<p></p>", requirements: "[]" })).toBe(false);
    expect(hasOwnToolDoc({ guide: "<p>&nbsp;</p>", requirements: "not json" })).toBe(false);
  });

  it("is true with a guide of its own, HTML or legacy text", () => {
    expect(hasOwnToolDoc({ guide: "<p>Tắt Secure Boot rồi chạy loader.</p>", requirements: null })).toBe(true);
    expect(hasOwnToolDoc({ guide: "Chạy loader bằng quyền admin.", requirements: null })).toBe(true);
    expect(hasOwnToolDoc({ guide: '<p><img src="/a.webp"></p>', requirements: null })).toBe(true);
  });

  it("is true with requirements of its own, stored or parsed", () => {
    expect(
      hasOwnToolDoc({ guide: null, requirements: JSON.stringify([{ label: "Windows", value: "10/11" }]) }),
    ).toBe(true);
    expect(hasOwnToolDoc({ guide: "", requirements: [{ label: "Windows", value: "10/11" }] })).toBe(true);
  });
});
