import { describe, expect, it } from "vitest";

import { sentenceCase, titleCase } from "@/lib/displayCase";

/** How the lab's game tiles print the same names. */
describe("titleCase", () => {
  it("gives every word a capital first letter, acronyms kept", () => {
    expect(titleCase("HACK ĐỘT KÍCH CFVN - CF4VN")).toBe("Hack Đột Kích CFVN - CF4VN");
    expect(titleCase("TOOL HACK + ACC LIÊN MINH HUYỀN THOẠI - LOL")).toBe(
      "Tool Hack + Acc Liên Minh Huyền Thoại - LOL",
    );
    expect(titleCase("HACK GTA 5 ONLINE")).toBe("Hack GTA 5 Online");
    expect(titleCase("HWID SPOOFER")).toBe("HWID Spoofer");
  });

  it("keeps iOS and the small joining words of a game's name", () => {
    expect(titleCase("PUBG MOBILE IOS")).toBe("PUBG Mobile iOS");
    expect(titleCase("CALL OF DUTY WARZONE 3 - MW3")).toBe("Call of Duty Warzone 3 - MW3");
    expect(titleCase("HACK CALL OF DUTY - WARZONE - BLACK OPS 6")).toBe(
      "Hack Call of Duty - Warzone - Black Ops 6",
    );
  });

  it("leaves words the admin typed in mixed case alone", () => {
    expect(titleCase("HACK CS2 - Counter Strike 2")).toBe("Hack CS2 - Counter Strike 2");
    expect(titleCase("Hack Freefire")).toBe("Hack Freefire");
  });
});

/** How the home cards print a category typed in capitals. */
describe("sentenceCase", () => {
  it("keeps only the first letter capital, and the acronyms", () => {
    expect(sentenceCase("HACK ĐỘT KÍCH CFVN - CF4VN")).toBe("Hack đột kích CFVN - CF4VN");
    expect(sentenceCase("CALL OF DUTY WARZONE 3 - MW3")).toBe("Call of duty warzone 3 - MW3");
    expect(sentenceCase("TOOL HACK + ACC LIÊN MINH HUYỀN THOẠI - LOL")).toBe(
      "Tool hack + acc liên minh huyền thoại - LOL",
    );
    expect(sentenceCase("PUBG MOBILE IOS")).toBe("PUBG mobile iOS");
    expect(sentenceCase("HWID SPOOFER")).toBe("HWID spoofer");
    expect(sentenceCase("HACK CALL OF DUTY - WARZONE - BLACK OPS 6")).toBe(
      "Hack call of duty - warzone - black ops 6",
    );
  });

  it("leaves words the admin typed in mixed case alone", () => {
    expect(sentenceCase("HACK CS2 - Counter Strike 2")).toBe("Hack CS2 - Counter Strike 2");
    expect(sentenceCase("Hack Freefire")).toBe("Hack Freefire");
    expect(sentenceCase("  hack   valorant ")).toBe("Hack valorant");
  });

  it("keeps the build names in the shop's product titles", () => {
    expect(sentenceCase("HACK CS2 BẢN MS RAGE SIÊU BÁ")).toBe("Hack CS2 bản MS rage siêu bá");
    expect(sentenceCase("BẢN AIMWARE - CS2 HVH SPIN BOT")).toBe("Bản aimware - CS2 HVH spin bot");
    expect(sentenceCase("HACK TRUY KÍCH PC - TRUY KÍCH 2 BẢN PV TK - PV x THICHTHIHACK")).toBe(
      "Hack truy kích PC - truy kích 2 bản PV TK - PV x THICHTHIHACK",
    );
    expect(sentenceCase("HACK DELTA FORCE BẢN VS FULL GIÁ RẺ - ESP + AIMBOT + ITEM !!!")).toBe(
      "Hack delta force bản VS full giá rẻ - ESP + aimbot + item !!!",
    );
  });
});
