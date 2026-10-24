import { describe, expect, it } from "vitest";

import { shortBlurb } from "@/lib/shortBlurb";

describe("shortBlurb", () => {
  it("leaves a short blurb whole, with its spaces tidied", () => {
    expect(shortBlurb("Bản OBV  cho Blood Strike.\n")).toBe("Bản OBV cho Blood Strike.");
  });

  it("stops at the last whole word before the limit and closes with dots", () => {
    const text =
      "Bản OBV internal cho Blood Strike: ESP, aimbot, không giật, mod skin. Máy nhà và net, Windows 10, 11. Key từ 85.000đ/ngày.";
    const out = shortBlurb(text, 105);
    expect(out.endsWith("…")).toBe(true);
    expect(out).toBe("Bản OBV internal cho Blood Strike: ESP, aimbot, không giật, mod skin. Máy nhà và net, Windows 10, 11. Key…");
    expect(text.startsWith(out.slice(0, -1))).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });

  it("drops punctuation left before the dots", () => {
    expect(shortBlurb("Một hai ba. Bốn năm sáu, bảy tám chín mười.", 12)).toBe("Một hai ba…");
  });

  it("cuts a word without spaces at the limit", () => {
    expect(shortBlurb("a".repeat(30), 10)).toBe(`${"a".repeat(10)}…`);
  });
});
